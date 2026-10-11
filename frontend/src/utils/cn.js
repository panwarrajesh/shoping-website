export const cn = (...c) => c.filter(Boolean).join(' ');
export const rupee = (n) => '₹' + Number(n).toLocaleString('en-IN');
