export const buildFashionNavbarSocials = (phoneNumber?: string) => {
  const digits = (phoneNumber ?? "").replace(/\D+/g, "");
  return {
    facebookUrl: "https://facebook.com",
    whatsappUrl: digits ? `https://wa.me/${digits}` : "https://wa.me/"
  };
};

