/**
 * BulkSMS BD SMS Gateway Integration
 * Supports standard BulkSMS BD API endpoints (HTTP POST/GET)
 * Zero hardcoded credentials. Credentials must come from environment.
 */

interface SendSmsOptions {
  phone: string
  message: string
}

interface SendSmsResult {
  success: boolean
  messageId?: string
  responseCode?: string
  error?: string
}

export async function sendBulkSmsBd({ phone, message }: SendSmsOptions): Promise<SendSmsResult> {
  const apiKey = process.env.BULKSMS_BD_API_KEY
  const senderId = process.env.BULKSMS_BD_SENDER_ID
  const apiUrl = process.env.BULKSMS_BD_URL || "https://bulksmsbd.net/api/smsapi"

  if (!apiKey || !senderId) {
    console.warn("[BulkSMS BD] Credentials missing (BULKSMS_BD_API_KEY / BULKSMS_BD_SENDER_ID).")
    return {
      success: false,
      error: "BULKSMS_BD_API_KEY or BULKSMS_BD_SENDER_ID is not configured in environment.",
    }
  }

  // BD phone number formatting: always ensures 8801XXXXXXXXX
  const digits = phone.replace(/\D/g, "")
  let formattedNumber = digits
  if (digits.startsWith("880") && digits.length === 13) {
    formattedNumber = digits
  } else if (digits.startsWith("0") && digits.length === 11) {
    formattedNumber = "88" + digits
  } else if (digits.length === 10) {
    formattedNumber = "880" + digits
  } else if (!digits.startsWith("88")) {
    formattedNumber = "88" + digits
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      senderid: senderId,
      number: formattedNumber,
      message: message,
      type: "text",
    })

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const resultText = await response.text()

    // Check BulkSMS BD responses (JSON or response code string)
    try {
      const data = JSON.parse(resultText)
      if (
        data.response_code === 202 ||
        data.response_code === 200 ||
        data.success === true ||
        data.status === "success"
      ) {
        return { success: true, messageId: data.message_id || data.msg_id }
      }

      let errorMsg = data.error_message || data.msg || "SMS delivery failed"
      if (data.response_code === 1032) {
        errorMsg = "BulkSMS BD: Server IP must be whitelisted in BulkSMS BD portal."
      } else if (errorMsg.includes("is_masking") || errorMsg.includes("senderid")) {
        errorMsg = "BulkSMS BD: Specified Sender ID is not approved for this account."
      }
      return { success: false, error: errorMsg, responseCode: String(data.response_code) }
    } catch {
      if (resultText.includes("1000") || resultText.includes("SUBMITTED") || resultText.includes("SUCCESS")) {
        return { success: true, messageId: resultText }
      }
      return { success: false, error: `Gateway response: ${resultText}` }
    }
  } catch (err: any) {
    console.error("[BulkSMS BD] Error sending SMS:", err.message)
    return {
      success: false,
      error: "Failed to reach SMS gateway",
    }
  }
}
