// Print one tab-separated line: <iso>\t<slug>, without a trailing newline.
const d = new Date();
const pad = (n) => String(n).padStart(2, "0");
const tzMin = -d.getTimezoneOffset();
const tzSign = tzMin >= 0 ? "+" : "-";
const tzAbs = Math.abs(tzMin);
const offset = `${tzSign}${pad(Math.floor(tzAbs / 60))}${pad(tzAbs % 60)}`;
const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offset}`;
const slug = iso.slice(0, 19).replaceAll(":", "-").replace("T", "_");
process.stdout.write(`${iso}\t${slug}`);
