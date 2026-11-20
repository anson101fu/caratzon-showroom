$ErrorActionPreference = 'Stop'
try {
  $source = Join-Path $PSScriptRoot 'products.json'
  if (-not (Test-Path -LiteralPath $source)) { throw 'Cannot find products.json in this folder.' }
  $raw = Get-Content -LiteralPath $source -Raw -Encoding UTF8 | ConvertFrom-Json
  $seen = @{}
  $rows = foreach ($item in $raw) {
    $sku = [string]$item.sku
    if ([string]::IsNullOrWhiteSpace($sku)) { throw 'A product has no SKU.' }
    if ($seen.ContainsKey($sku)) { throw ('Duplicate SKU: ' + $sku) }
    $seen[$sku] = $true
    $retail = [decimal]$item.retail
    $wholesale = [decimal]$item.wholesale
    if ($retail -lt 0 -or $wholesale -lt 0) { throw ('Negative price: ' + $sku) }
    [pscustomobject][ordered]@{
      sku = $sku
      unit_retail_cny = $retail.ToString([cultureinfo]::InvariantCulture)
      unit_wholesale_cny = $wholesale.ToString([cultureinfo]::InvariantCulture)
      active = 'true'
    }
  }
  $target = Join-Path $PSScriptRoot 'caratzon-catalog-prices.csv'
  $rows | Export-Csv -LiteralPath $target -NoTypeInformation -Encoding UTF8
  Write-Host ('SUCCESS: ' + $rows.Count + ' rows exported to ' + $target)
} catch {
  Write-Host ('ERROR: ' + $_.Exception.Message)
  exit 1
}
