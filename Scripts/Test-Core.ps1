$ErrorActionPreference = "Stop"

$swiftRoot = Join-Path $env:LOCALAPPDATA "Programs\Swift"
$toolchain = Join-Path $swiftRoot "Toolchains\6.3.2+Asserts\usr\bin"
$runtime = Join-Path $swiftRoot "Runtimes\6.3.2\usr\bin"
$redistributables = Join-Path $swiftRoot "Redistributables"
$msvc = "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.50.35717"
$windowsKit = "C:\Program Files (x86)\Windows Kits\10"
$windowsKitVersion = "10.0.26100.0"
$swiftSDK = Join-Path $swiftRoot "Platforms\6.3.2\Windows.platform\Developer\SDKs\Windows.sdk"

[Environment]::SetEnvironmentVariable("PATH", $null, "Process")
[Environment]::SetEnvironmentVariable(
    "Path",
    "$toolchain;$runtime;$redistributables;$msvc\bin\Hostx64\x64;$windowsKit\bin\$windowsKitVersion\x64;$windowsKit\bin\x64;" +
        [Environment]::GetEnvironmentVariable("Path", "Process"),
    "Process"
)

$env:LIB = "$msvc\lib\x64;$windowsKit\Lib\$windowsKitVersion\ucrt\x64;$windowsKit\Lib\$windowsKitVersion\um\x64"
$env:INCLUDE = "$msvc\include;$windowsKit\Include\$windowsKitVersion\ucrt;$windowsKit\Include\$windowsKitVersion\um;$windowsKit\Include\$windowsKitVersion\shared;$windowsKit\Include\$windowsKitVersion\winrt;$windowsKit\Include\$windowsKitVersion\cppwinrt"

& "$toolchain\swift.exe" test `
    --disable-sandbox `
    --sdk "$swiftSDK" `
    -Xswiftc -visualc-tools-root -Xswiftc "$msvc" `
    -Xswiftc -visualc-tools-version -Xswiftc "14.50.35717" `
    -Xswiftc -windows-sdk-root -Xswiftc "$windowsKit" `
    -Xswiftc -windows-sdk-version -Xswiftc "$windowsKitVersion"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
