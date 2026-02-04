# 需要管理员权限运行
# 用于修补 node-gyp 以支持 VS 2026

$ErrorActionPreference = "Stop"

$nodeGypPath = "C:\Program Files\nodejs\node_modules\npm\node_modules\node-gyp\lib\find-visualstudio.js"

if (-not (Test-Path $nodeGypPath)) {
    Write-Error "找不到 node-gyp 文件: $nodeGypPath"
    exit 1
}

Write-Host "正在修补 node-gyp 以支持 VS 2026..." -ForegroundColor Cyan

$content = Get-Content $nodeGypPath -Raw

# 检查是否已经修补过
if ($content -match "versionMajor === 18") {
    Write-Host "node-gyp 已经支持 VS 2026，无需修补" -ForegroundColor Green
    exit 0
}

# 添加 VS 2026 支持到 getVersionInfo
$oldCode1 = @"
    if (ret.versionMajor === 17) {
      ret.versionYear = 2022
      return ret
    }
    this.log.silly('- unsupported version:', ret.versionMajor)
"@

$newCode1 = @"
    if (ret.versionMajor === 17) {
      ret.versionYear = 2022
      return ret
    }
    if (ret.versionMajor === 18) {
      ret.versionYear = 2026
      return ret
    }
    this.log.silly('- unsupported version:', ret.versionMajor)
"@

$content = $content.Replace($oldCode1, $newCode1)

# 添加 VS 2026 工具集支持到 getToolset
$oldCode2 = @"
    if (versionYear === 2017) {
      return 'v141'
    } else if (versionYear === 2019) {
      return 'v142'
    } else if (versionYear === 2022) {
      return 'v143'
    }
"@

$newCode2 = @"
    if (versionYear === 2017) {
      return 'v141'
    } else if (versionYear === 2019) {
      return 'v142'
    } else if (versionYear === 2022) {
      return 'v143'
    } else if (versionYear === 2026) {
      return 'v145'
    }
"@

$content = $content.Replace($oldCode2, $newCode2)

# 写回文件
Set-Content $nodeGypPath -Value $content -NoNewline

Write-Host "修补完成！node-gyp 现在支持 VS 2026" -ForegroundColor Green
