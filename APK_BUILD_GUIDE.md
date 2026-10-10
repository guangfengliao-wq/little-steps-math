# Android 打包与发布

流程参考相邻“单词本”项目，应用名称为“小小数学家”，安装包前缀为 `little-steps-math`，应用标识保持 `com.littlemath.garden`。

## 首次准备

- 安装 Node.js 22.6 或更高版本，运行 `npm ci`。
- 安装 JDK 21。脚本依次检查 `JAVA_HOME`、Android Studio 自带 JDK 和 PATH，选用 JDK 21–24。
- 安装 Android SDK、API 36、Build-Tools 35.0.0，并接受 SDK 许可。可通过 `ANDROID_HOME`、`ANDROID_SDK_ROOT` 或 `android/local.properties` 指定 SDK；未配置时尝试系统默认目录。
- 首次构建需联网下载 Gradle 8.14.3 和 Maven 依赖。默认缓存位于本项目 `.gradle-user-home/`；可用 `GRADLE_USER_HOME` 指定其他目录。

## 一键打包

```sh
npm run pack
```

每次执行先递增补丁版本，例如 `0.1.0 → 0.1.1`，同步更新 `package.json`、`package-lock.json`、Android `versionName`，并将 `versionCode` 加一。后续构建失败也保留递增结果，与单词本一致。

随后运行测试、网页构建、Capacitor 同步和 Gradle `assembleDebug`。成功后生成：

- `release/little-steps-math-v<版本号>.apk`：对应版本的安装包。
- `release/little-steps-math.apk`：最新成功构建的副本。
- `release/install-qr.png`、`release/install.html`：局域网扫码安装入口。

失败时旧 APK 不代表本次构建成功。若仅二维码分享失败，APK 仍已生成，可运行 `npm run share` 重试。

## 安装与局域网分享

电脑与平板连接同一局域网，扫码下载并安装。下载服务在后台运行，默认端口 **5181**，与单词本的 5180 分开；需保持电脑开机，允许 Windows 专用网络防火墙访问。

```sh
npm run share
```

此命令只启动或复用分享服务并重新生成二维码，不打包、不递增版本。多网卡时可设置 `APK_SHARE_HOST` 为本机局域网 IPv4 地址。日志位于 `release/apk-share.log`。也可手动复制 APK 到平板，或执行：

```sh
adb install -r release/little-steps-math.apk
```

APK 使用本机调试密钥签名，适合个人设备安装，最低支持 Android 7.0。保留本机 `~/.android/debug.keystore`，更新时使用相同签名覆盖安装以保留学习记录；不要先卸载。应用商店上架需要另行配置正式签名。题目朗读依赖设备中文语音服务。

## 发布到 GitHub Releases

1. 更新 `RELEASE_NOTES.md`，运行 `npm run pack`。
2. 运行 `npm run release:check` 检查本地 APK、版本和仓库。
3. 提交并推送代码及版本变更。
4. 运行 `npm run release` 发布当前版本。

发布目标从 Git 的 `origin` 读取，本项目应为 `guangfengliao-wq/little-steps-math`。发布命令不构建、不递增版本，要求工作区干净且当前提交已推送到远程分支。凭据使用 `GH_TOKEN` / `GITHUB_TOKEN`，或已登录的 Git 凭据管理器；不将凭据写入项目。

脚本创建 `v<版本号>` 草稿，上传带版本号的 APK，验证 SHA-256 后发布。上传中断可重试；同名同内容附件可复用，不会覆盖同名但内容不同的安装包。发布公告来自 `RELEASE_NOTES.md`。

发布后生成 `release/github-install-v<版本号>.png` 和 `.html`，扫码直接访问 GitHub APK 下载地址，无需与电脑处于同一局域网。私有仓库需要访问权限。

`--dry-run` 不读取凭据、不访问 GitHub、不上传。`pack` 和 `share` 也不会发布到 GitHub。

## 故障排查

- JDK / SDK 找不到：检查上述环境变量及 SDK 安装目录。
- Gradle 或 Maven 下载失败：检查网络；如需代理，在本项目 `.gradle-user-home/gradle.properties` 配置有效代理，避免沿用过期全局配置。
- 二维码服务启动失败：检查 5181 端口占用、网络地址和 `release/apk-share.log`。
- 覆盖安装提示签名冲突：使用原签名密钥重新打包。
- 发布失败：检查 GitHub 仓库权限、当前提交是否推送，以及版本 APK 是否存在。
