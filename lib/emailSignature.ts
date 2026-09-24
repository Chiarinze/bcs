/**
 * Sign-off inserted by the "Signature" button in the newsletter editor.
 * Edit here to change it everywhere; it stays editable after insertion.
 */
export const SIGNATURE_NAME = "Chidera Arinze";
export const SIGNATURE_ORG = "The Benin Chorale and Philharmonic, Nigeria";

export const SOCIAL_LINKS: { label: string; url: string }[] = [
  { label: "Facebook", url: "https://www.facebook.com/BcsNig/" },
  { label: "Instagram", url: "https://www.instagram.com/the_benin_chorale_society/" },
  { label: "TikTok", url: "https://www.tiktok.com/@beninchoraleandphil" },
  { label: "YouTube", url: "https://www.youtube.com/@Beninchoraleandphilharmonic" },
];

export const SIGNATURE_HTML =
  `<p>Warm regards,</p>` +
  `<p><strong>${SIGNATURE_NAME}</strong><br>${SIGNATURE_ORG}</p>` +
  `<p>` +
  SOCIAL_LINKS.map((s) => `<a href="${s.url}">${s.label}</a>`).join(" | ") +
  `</p>`;
