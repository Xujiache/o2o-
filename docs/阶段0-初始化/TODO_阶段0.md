# 阶段 0 — 待办与缺少配置(TODO)

> 用途:列出阶段 0 完成但仍需用户配合提供的资源/决策/动作。
> 状态标识:🟥 必须(影响阶段 1 启动)/ 🟨 建议(改善体验) / 🟩 知识共享(无需立即处理)

## 一、第三方凭证(用户必须提供)

阶段 0 已搭好 6 个 provider 的适配器(mock + real-stub),但生产联调需用户提供以下凭证。
真凭证写入 `.env`(**不进 git**)后,把环境变量 `INTEGRATION_MODE=mock` 改 `real` 即可切换。

| 🟥 高德地图 | 文档:https://lbs.amap.com/api/webservice/guide/api/georegeo               |
| ----------- | ------------------------------------------------------------------------- |
| 用途        | 用户端定位 / 距离计算 / 路线规划 / 骑手轨迹回放                           |
| 需提供      | `AMAP_KEY`(Web 服务 API)+ `AMAP_SECURITY_JS_CODE`(可选,小程序需要)        |
| 写入位置    | `.env` 根 + `apps/customer-app/manifest.json` h5.sdkConfigs.maps.amap.key |
| 启用阶段    | stage 4(用户端外卖交易闭环)                                               |

| 🟥 微信支付 | 文档:https://pay.weixin.qq.com/docs/merchant                                   |
| ----------- | ------------------------------------------------------------------------------ |
| 用途        | 用户端微信小程序内支付 + 用户端 APP 支付                                       |
| 需提供      | `WXPAY_MCHID`(商户号)+ `WXPAY_API_V3_KEY`(APIv3 密钥)+ `WXPAY_CERT_PATH`(证书) |
| 写入位置    | `.env` 根 + 后端 `apps/server/.env`                                            |
| 启用阶段    | stage 5(用户端外卖闭环 + 跑腿闭环)                                             |

| 🟥 支付宝 | 文档:https://opendocs.alipay.com/open/00aor4                 |
| --------- | ------------------------------------------------------------ |
| 用途      | 用户端支付宝 APP + H5 支付                                   |
| 需提供    | `ALIPAY_APP_ID` + `ALIPAY_PRIVATE_KEY` + `ALIPAY_PUBLIC_KEY` |
| 写入位置  | `.env` 根                                                    |
| 启用阶段  | stage 5                                                      |

| 🟥 阿里云短信 | 文档:https://help.aliyun.com/document_detail/55284.html                                |
| ------------- | -------------------------------------------------------------------------------------- |
| 用途          | 4 端登录验证码 + 业务短信模板                                                          |
| 需提供        | `ALI_SMS_ACCESS_KEY_ID` + `ALI_SMS_ACCESS_KEY_SECRET` + `ALI_SMS_SIGN_NAME` + 模板列表 |
| 写入位置      | `.env` 根                                                                              |
| 启用阶段      | stage 1(用户端登录)                                                                    |

| 🟥 阿里云实名认证 | 文档:https://help.aliyun.com/document_detail/142838.html                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| 用途              | 用户实名 + 骑手实名 + 商家法人核验                                                        |
| 需提供            | `ALI_REALNAME_ACCESS_KEY_ID` + `ALI_REALNAME_ACCESS_KEY_SECRET` + `ALI_REALNAME_APP_CODE` |
| 写入位置          | `.env` 根                                                                                 |
| 启用阶段          | stage 1+(用户实名);stage 2(商家入驻);stage 3(骑手入驻)                                    |

| 🟥 个推推送 | 文档:https://docs.getui.com/getui/start/devcenter/                              |
| ----------- | ------------------------------------------------------------------------------- |
| 用途        | 骑手端 / 商家端 APP 推送                                                        |
| 需提供      | `GETUI_APP_ID` + `GETUI_APP_KEY` + `GETUI_MASTER_SECRET` + Android/iOS 通道证书 |
| 写入位置    | `.env` 根 + `apps/{merchant,rider}-app/manifest.json` Push 模块配置             |
| 启用阶段    | stage 3                                                                         |

| 🟨 阿里云 OSS / 腾讯云 COS(替代 MinIO) | 当前已用本地 MinIO                        |
| -------------------------------------- | ----------------------------------------- |
| 用途                                   | 生产环境对象存储(资质/凭证/头像)          |
| 需提供                                 | endpoint + AccessKey + SecretKey + bucket |
| 写入位置                               | `.env` 根 `STORAGE_*`                     |
| 启用阶段                               | stage 11(部署)                            |

## 二、UI 库与设计稿确认(用户决策)

| 🟨 平台 Web UI 库  | 当前选 Element Plus + UnoCSS。是否需要切换 Naive UI / Ant Design Vue? | 阶段 4 启动前确认                   |
| ------------------ | --------------------------------------------------------------------- | ----------------------------------- |
| 🟨 4 端 UI 设计稿  | 当前未提供;阶段 0 仅占位骨架                                          | 阶段 1 启动前给到 Figma/Sketch 链接 |
| 🟨 全局色板 / Logo | 当前默认蓝色 + emoji 图标                                             | 阶段 1 替换                         |
| 🟨 统一字体        | 默认系统字体栈                                                        | 阶段 1 决定是否需要自定义字体       |

## 三、iOS 打包准备(stage 11 前确认)

| 🟨 Apple Developer 账号 | iOS APP 上架需要                                  |
| ----------------------- | ------------------------------------------------- |
| 🟨 推送证书             | iOS APP push 需要 .p12 文件                       |
| 🟨 IDFA / 隐私          | iOS 14+ 强制 ATT 弹窗,需在 App Store 隐私清单声明 |

## 四、Android 打包准备(stage 11 前确认)

| 🟨 应用签名 keystore  | Android APK 上架需要                                             |
| --------------------- | ---------------------------------------------------------------- |
| 🟨 渠道商分发账号     | 华为 / 小米 / OPPO / vivo 应用市场账号                           |
| 🟨 后台保活白名单引导 | 各厂商不同,文案在 `apps/rider-app/src/services/README.md` 已提示 |

## 五、HBuilderX(用户必须本机安装)

| 🟥 商家端 / 骑手端真机调试 | dcloudio Uni-app APP 编译需 HBuilderX 5.x+                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| 操作                       | 下载 https://www.dcloud.io/hbuilderx.html → 打开 `apps/{merchant,rider}-app` 目录 → 选运行平台 |

## 六、CI/CD 实际生效需要(stage 11 前确认)

| 🟨 GitHub 仓库地址    | 当前本地 git 仓库,未推到远端       |
| --------------------- | ---------------------------------- |
| 🟨 GH Actions secrets | 部署用 SSH key / 镜像仓库账号 / 等 |
| 🟨 镜像仓库           | Docker Hub / 阿里云 ACR 二选一     |

## 七、生产环境准备(stage 11)

| 🟨 域名 + SSL 证书 | 4 端 + 后端 API 各自子域名         |
| ------------------ | ---------------------------------- |
| 🟨 服务器          | 后端建议 4 vCPU/8 GB+;DB 托管(RDS) |
| 🟨 监控告警        | Prometheus + Grafana / 云厂商方案  |
| 🟨 日志聚合        | Loki / ELK / 云厂商方案            |

## 八、本地开发体验提示(知识共享 🟩)

| 🟩 Windows 多 dev 并跑           | 用 `Stop-Process -Id <PID> -Force` 显式 kill,`netstat -ano                      | findstr :PORT` 查 PID;TaskStop 父进程后子 node 仍占端口 |
| -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 🟩 nest watch 端口冲突不自动恢复 | 需手动清旧进程后再启                                                            |
| 🟩 dev token 工具                | `pnpm --filter @o2o/server token:dev <scope>` 一键生成 4 端测试 token,有效期 2h |
| 🟩 ConfigCacheRefreshJob 兜底    | 阶段 0 sys_config 表为空,job 跑空轮询不影响;stage 4+ 接入配置项后即时刷新       |
| 🟩 DomainEventRetryJob 重试上限  | 5 次后 status=failed;手动修补可改 nextRetryAt + retryCount 后由 job 自动接管    |

## 九、阶段 1 启动前 checklist

进入阶段 1 前,用户与建设者各确认下列:

- [ ] 用户:已提供阿里云短信凭证(stage 1 用户登录依赖)
- [ ] 用户:已提供阿里云实名凭证(stage 1 用户实名依赖)
- [ ] 用户:已确认 4 端 UI 设计稿来源(或同意继续用骨架样式)
- [ ] 用户:已确认 dcloudio uni-app 仍用 dist-tag `vue3`(若 dcloudio 期间发布正式版可锁定)
- [ ] 建设者:本地 dev 全部干净启动(4 容器 + 4 端 + 后端)
- [ ] 建设者:`pnpm -r test` 全绿
- [ ] 建设者:阶段 1 ALIGNMENT/CONSENSUS/DESIGN/TASK 文档先行
