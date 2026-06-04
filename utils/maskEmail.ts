function maskEmail(email: string) {
  const [local, domain] = email.split("@");

  return `${local.slice(0, 2)}****${local.slice(-3)}@${domain}`;
}

export default maskEmail;
