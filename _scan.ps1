$files = Get-ChildItem -LiteralPath "src\app","src\components" -Recurse -File -Filter *.tsx
$total = 0
$rows = @()
foreach ($f in $files) {
  $m = Select-String -LiteralPath $f.FullName -Pattern '>\s*[A-Z][A-Za-z0-9 ,.&''()/?:-]{2,}<|title="[A-Z]|placeholder="[A-Z]|label="[A-Z]|alt="[A-Z]|''[A-Z][a-z]+ [a-z]' -AllMatches
  $n = 0
  if ($m) { foreach ($x in $m) { $n += $x.Matches.Count } }
  if ($n -gt 0) { $total += $n; $rows += [pscustomobject]@{ N=$n; File=$f.FullName.Replace('D:\DukanOS\','') } }
}
$rows | Sort-Object N -Descending | Format-Table -AutoSize
"FILES with strings: $($rows.Count)"
"TOTAL approx string nodes: $total"
