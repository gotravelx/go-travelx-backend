function isValidDateFormat(dateStr) {
  const regex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/;
  if (!regex.test(dateStr)) {
    return false;
  }

  // Additional validation for valid month/day combinations
  const [month, day, year] = dateStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

export default isValidDateFormat;
