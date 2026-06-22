export function sanitizeNotificationText(text) {
  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const hasEmoji = emojiRegex.test(text);
  const cleanText = text.replace(emojiRegex, "").replace(/\s+/g, " ").trim();

  if (!hasEmoji) {
    return cleanText;
  }

  if (cleanText.length === 0) {
    return "[Emoji]";
  }

  return `${cleanText} [emoji]`;
}
