# Anna Glass V2 第三轮交互修正 — 测试说明

本轮只以用户的 ESLyric 真正搜索窗口（图 1）及实机播放器（图 3）为参照；忽略图 2 渲染图。

- **ESLyric**：歌词右键 `ESLyric: Open Lyric Search window...` 先执行 `View/ESLyric/Search...`，以打开真实搜索窗口。`RequestLyric(title,artist)` 只是后台歌词请求，已改为独立菜单项。如果 ESLyric 版本或语言不同，可右键设置真实 `View/ESLyric/...` 菜单路径；执行失败会提示。
- **导航**：三个顶部导航状态保存在本地并通过 `JSPANEL:NavTabs` 显式通知，修复再生中无选中光效。
- **模式开关**：GLASS/NATIVE 共用 111×28 固定位置，文字和滑块不随状态漂移。
- **底栏**：彻底重绘全部七个透明 GDI 矢量图标、播放暂停环，不再引用独立 `play_ring.png`。音量条使用进度条式玻璃凹槽与粉色发光滑块；不显示百分比，QUEUE 位置不变。
- **歌词菜单**：Tags / Configuration folder / Same folder as track / Browse 四项明确标注“读取歌词 / Read lyrics”；它们不改 ESLyric 自己的保存设置。
- **同步歌词定位**：上下拖动歌词行，松开后播放位置跳到目标歌词的起始时间；单击某行也可定位。
- **Karaoke**：只有包含 `<mm:ss.xx>` 内部时间标记的增强 LRC 才进行渐进逐字着色；同一标记下多个字按下一时间标记线性均分（估算，不是原始逐字时间）。普通 LRC 继续按整行高亮。125ms 定时器只在增强 LRC 行播放时刷新面板。
- **滚动条**：左侧浏览器与中间 Glass 歌曲列表支持点击轨道、拖动滑块，避免与歌曲拖放操作冲突。Native 模式保留原生滚动条。
- **Desk ON/OFF**：按钮固定 101px，使用双色滑块；状态仍读取 ESLyric 主菜单真实勾选状态。

开发侧验证：`node tests/test_vnext.mjs`、`node tests/test_round3.mjs`、JS 语法与打包完整性。不能代替 Windows 实机的 ESLyric 命令、面板 GDI 渲染、真实拖动/鼠标捕获验收。测试前备份现有皮肤，先解压至独立目录；不包含 DLL 或 16:9 修改。
