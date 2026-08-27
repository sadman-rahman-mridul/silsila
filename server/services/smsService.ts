/**
 * BulkSMS BD SMS Gateway Integration
 * Supports standard BulkSMS BD API endpoints (HTTP POST/GET)
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
  const apiKey = process.env.BULKSMS_BD_API_KEY || "CEk1QvidKiArNccVNNqq"
  const senderId = process.env.BULKSMS_BD_SENDER_ID || "8809617622724"
  const apiUrl = process.env.BULKSMS_BD_URL || "https://bulksmsbd.net/api/smsapi"

  if (!apiKey || !senderId) {
    console.warn("[BulkSMS BD] Credentials missing (BULKSMS_BD_API_KEY / BULKSMS_BD_SENDER_ID).")
    return {
      success: false,
      error: "BULKSMS_BD_API_KEY or BULKSMS_BD_SENDER_ID is not configured in environment.",
    }
  }

  // Bulletproof BD phone number formatting: always ensures 8801XXXXXXXXX
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
    console.log("[BulkSMS BD] Response:", resultText)

    // Check BulkSMS BD responses (JSON or response code string)
    try {
      const data = JSON.parse(resultText)
      if (data.response_code === 202 || data.response_code === 200 || data.success === true || data.status === "success") {
        return { success: true, messageId: data.message_id || data.msg_id }
      }
      
      let errorMsg = data.error_message || data.msg || "SMS delivery failed"
      if (data.response_code === 1032) {
        errorMsg = `BulkSMS BD: আপনার সার্ভার IP (${data.error_message?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || "IP"}) BulkSMS BD ড্যাশবোর্ডে Whitelist করতে হবে (Settings > IP Whitelist বা Phonebook)।`
      } else if (errorMsg.includes("is_masking") || errorMsg.includes("senderid")) {
        errorMsg = `BulkSMS BD: দেওয়া Sender ID টি আপনার অ্যাকাউন্টে অনুমোদিত নয়। দয়া করে BulkSMS BD ড্যাশবোর্ড > Sender ID ট্যাব থেকে সঠিক Sender ID টি Settings-এ দিন।`
      }
      return { success: false, error: errorMsg, responseCode: String(data.response_code) }
    } catch {
      // String responses (e.g., "1000", "SMS SUBMITTED: 1902")
      if (resultText.includes("1000") || resultText.includes("SUBMITTED") || resultText.includes("SUCCESS")) {
        return { success: true, messageId: resultText }
      }
      return { success: false, error: `Gateway response: ${resultText}` }
    }
  } catch (err: any) {
    console.error("[BulkSMS BD] Error sending SMS:", err)
    return {
      success: false,
      error: err.message || "Failed to reach SMS gateway",
    }
  }
}
