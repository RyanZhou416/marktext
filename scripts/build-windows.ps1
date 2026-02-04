<# 
.SYNOPSIS
    MarkText Windows 本地构建脚本

.DESCRIPTION
    用于在本地构建 MarkText Windows 版本的 PowerShell 脚本
    支持多种构建类型：完整安装包、便携版、仅二进制

.PARAMETER BuildType
    构建类型：
    - installer: 完整安装包 (NSIS + ZIP)
    - portable:  便携版 (仅 ZIP)
    - binary:    仅构建二进制，不打包

.PARAMETER SkipInstall
    跳过 yarn install

.PARAMETER SkipLint
    跳过代码检查

.PARAMETER SkipTests
    跳过测试

.PARAMETER Clean
    构建前清理 build 目录

.EXAMPLE
    .\scripts\build-windows.ps1
    # 默认构建完整安装包

.EXAMPLE
    .\scripts\build-windows.ps1 -BuildType portable -SkipTests
    # 构建便携版，跳过测试

.EXAMPLE
    .\scripts\build-windows.ps1 -BuildType binary -SkipInstall -SkipLint
    # 快速构建二进制，跳过安装和检查
#>

param(
    [ValidateSet('installer', 'portable', 'binary')]
    [string]$BuildType = 'installer',
    
    [switch]$SkipInstall,
    [switch]$SkipLint,
    [switch]$SkipTests,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-Step {
    param([string]$Message)
    Write-Host "`n===> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 检查是否在项目根目录
function Test-ProjectRoot {
    if (-not (Test-Path "package.json")) {
        Write-Error "请在项目根目录运行此脚本"
        exit 1
    }
    
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.name -ne "marktext") {
        Write-Error "这不是 MarkText 项目目录"
        exit 1
    }
}

# 检查依赖
function Test-Dependencies {
    Write-Step "检查依赖..."
    
    # 检查 Node.js
    try {
        $nodeVersion = node --version
        Write-Host "Node.js: $nodeVersion"
        
        # 检查版本是否符合要求 (>=16 且 <17)
        $versionNum = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNum -lt 16) {
            Write-Error "需要 Node.js >= 16，当前版本: $nodeVersion"
            exit 1
        }
        if ($versionNum -ge 17) {
            Write-Warning "Node.js 版本 $nodeVersion 可能不兼容，建议使用 v16.x"
        }
    } catch {
        Write-Error "未找到 Node.js，请先安装"
        exit 1
    }
    
    # 检查 Yarn
    try {
        $yarnVersion = yarn --version
        Write-Host "Yarn: $yarnVersion"
    } catch {
        Write-Error "未找到 Yarn，请运行: npm install -g yarn"
        exit 1
    }
    
    # 检查 Python (node-gyp 需要)
    try {
        $pythonVersion = python --version 2>&1
        Write-Host "Python: $pythonVersion"
    } catch {
        Write-Warning "未找到 Python，原生模块编译可能失败"
    }
    
    Write-Success "依赖检查完成"
}

# 清理构建目录
function Clear-BuildDir {
    Write-Step "清理构建目录..."
    
    if (Test-Path "build") {
        Remove-Item -Recurse -Force "build"
        Write-Success "已清理 build 目录"
    }
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
        Write-Success "已清理 dist 目录"
    }
}

# 安装依赖
function Install-Dependencies {
    Write-Step "安装依赖..."
    
    yarn install --check-files --frozen-lockfile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "依赖安装失败"
        exit 1
    }
    
    Write-Success "依赖安装完成"
}

# 代码检查
function Invoke-Lint {
    Write-Step "代码检查..."
    
    yarn run lint
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "代码检查失败"
        exit 1
    }
    
    yarn run validate-licenses
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "许可证验证失败"
        exit 1
    }
    
    Write-Success "代码检查完成"
}

# 运行测试
function Invoke-Tests {
    Write-Step "运行测试..."
    
    yarn run test
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "测试失败"
        exit 1
    }
    
    Write-Success "测试完成"
}

# 构建
function Invoke-Build {
    param([string]$Type)
    
    Write-Step "构建 MarkText ($Type)..."
    
    $startTime = Get-Date
    
    switch ($Type) {
        'binary' {
            Write-Host "构建类型: 仅二进制文件"
            yarn build:bin
        }
        'portable' {
            Write-Host "构建类型: 便携版 (ZIP)"
            node .electron-vue/build.js
            npx electron-builder --win zip
        }
        'installer' {
            Write-Host "构建类型: 完整安装包 (NSIS + ZIP)"
            yarn run release:win
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "构建失败"
        exit 1
    }
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Success "构建完成，耗时: $([math]::Round($duration.TotalMinutes, 1)) 分钟"
}

# 显示构建结果
function Show-BuildResults {
    Write-Step "构建结果"
    
    if (-not (Test-Path "build")) {
        Write-Warning "build 目录不存在"
        return
    }
    
    Write-Host "`n生成的文件:" -ForegroundColor Yellow
    
    Get-ChildItem -Path "build" -File | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  $($_.Name) ($size MB)"
    }
    
    # 计算校验和
    Write-Host "`nSHA256 校验和:" -ForegroundColor Yellow
    
    Get-ChildItem -Path "build" -Include "*.exe", "*.zip" -File | ForEach-Object {
        $hash = (Get-FileHash -Algorithm SHA256 $_.FullName).Hash.ToLower()
        Write-Host "  $hash"
        Write-Host "    $($_.Name)"
    }
    
    Write-Host "`n构建产物位置: $(Resolve-Path 'build')" -ForegroundColor Green
}

# 主流程
function Main {
    $totalStartTime = Get-Date
    
    Write-Host @"
╔══════════════════════════════════════════════════════════╗
║           MarkText Windows 构建脚本                      ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan
    
    Write-Host "构建类型: $BuildType"
    Write-Host "跳过安装: $SkipInstall"
    Write-Host "跳过检查: $SkipLint"
    Write-Host "跳过测试: $SkipTests"
    Write-Host "清理构建: $Clean"
    
    # 检查项目目录
    Test-ProjectRoot
    
    # 检查依赖
    Test-Dependencies
    
    # 清理（如果需要）
    if ($Clean) {
        Clear-BuildDir
    }
    
    # 安装依赖
    if (-not $SkipInstall) {
        Install-Dependencies
    } else {
        Write-Warning "跳过依赖安装"
    }
    
    # 代码检查
    if (-not $SkipLint) {
        Invoke-Lint
    } else {
        Write-Warning "跳过代码检查"
    }
    
    # 运行测试
    if (-not $SkipTests) {
        Invoke-Tests
    } else {
        Write-Warning "跳过测试"
    }
    
    # 构建
    Invoke-Build -Type $BuildType
    
    # 显示结果
    Show-BuildResults
    
    $totalEndTime = Get-Date
    $totalDuration = $totalEndTime - $totalStartTime
    
    Write-Host @"

╔══════════════════════════════════════════════════════════╗
║           构建成功完成！                                  ║
║           总耗时: $([math]::Round($totalDuration.TotalMinutes, 1)) 分钟                                ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green
}

# 运行主流程
Main
