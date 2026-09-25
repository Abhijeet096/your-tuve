const blockedwords = [
  "fuck", "fucker", "fucking", "motherfucker", "shit", "bullshit", "bitch", "bastard",
  "asshole", "dick", "pussy", "cunt", "slut", "whore", "nigger", "nigga", "faggot", "retard",
  "chutiya", "chutiye", "madarchod", "behenchod", "bhenchod", "bhosdike", "bhosdi",
  "gandu", "randi", "harami", "lavda", "lauda", "lodu", "mc", "bc",
  "मादरचोद", "बहनचोद", "चूतिया", "भोसड़ी", "गांडू", "रंडी", "हरामी",
];

const leetmap = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "*": "u" };

const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[013457@$!*]/g, (ch) => leetmap[ch])
    .replace(/(.)\1{2,}/gu, "$1$1");

const splitwords = (text) => text.split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean);

const hasabuse = (clean) => {
  const words = splitwords(clean);
  return (
    words.some((w) => blockedwords.includes(w)) ||
    blockedwords.some((w) => w.length > 4 && clean.includes(w))
  );
};

const spamphrases = [
  "subscribe to my channel", "check out my channel", "sub4sub", "follow me on",
  "free money", "earn money from home", "click here", "whatsapp me", "dm for promotion",
  "crypto giveaway", "free followers",
];

const linkpattern = /(https?:\/\/|www\.)\S+|\b\S+\.(com|net|org|xyz|ru|in|io|ly|me)\b/gi;

export const checkcomment = (raw, recentbodies = []) => {
  const text = (raw || "").trim();
  if (!text) return "Comment can't be empty";
  if (text.length > 1000) return "Comment is too long (max 1000 characters)";

  const letters = text.match(/[\p{L}\p{N}]/gu)?.length || 0;
  const symbols = text.replace(/[\s\p{L}\p{N}\p{M}\p{Extended_Pictographic}‍️]/gu, "").length;
  if (letters === 0 && symbols > 0) return "Comment can't be only special characters";
  if (symbols >= 5 && symbols > letters) return "Too many special characters in this comment";
  if (/([^\p{L}\p{N}\p{M}\s\p{Extended_Pictographic}])\1{4,}/u.test(text)) return "Please don't repeat special characters";
  if (/(.)\1{9,}/u.test(text)) return "Please don't spam repeated characters";

  const clean = normalize(text);
  if (hasabuse(clean) || hasabuse(clean.replace(/(.)\1+/gu, "$1"))) {
    return "Your comment contains abusive language";
  }

  const words = splitwords(clean);
  const links = text.match(linkpattern) || [];
  if (links.length > 1) return "Comments with multiple links are treated as spam";
  if (spamphrases.some((p) => clean.includes(p))) return "This looks like spam";
  if (words.length >= 6 && new Set(words).size / words.length < 0.3) return "This looks like spam";

  const upper = text.replace(/[^A-Z]/g, "").length;
  const latin = text.replace(/[^A-Za-z]/g, "").length;
  if (latin > 20 && upper / latin > 0.8) return "Please don't write the whole comment in caps";

  if (recentbodies.some((b) => b.trim().toLowerCase() === text.toLowerCase())) {
    return "You already posted this comment";
  }
  return null;
};
