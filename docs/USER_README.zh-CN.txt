Hariiro — version 1.0.0 (2026-11-22) — 简体中文说明

foobar2000 的透明“玻璃”风格皮肤。

许可：MIT 许可证（见本包中的 LICENSE）。Copyright (c) 2026 zainchung。
适用于脚本、布局以及包内全部图片（含壁纸）。

运行要求
- foobar2000 v2，64 位（已在 2.26.3 测试），普通安装版或便携版均可：
  https://www.foobar2000.org/（不随包提供：其许可只允许分发未经修改的安装程序）
- Panels UI (reborn) 1.27.1 和 JS Panel (foo_js_panel) 1.9.2：已放在 components\ 中
  （MIT 许可，见 THIRD-PARTY-NOTICES.txt），安装脚本会自动安装
- 可选：ESLyric (x64)，用于下载歌词和桌面歌词

压缩包内容
- Hariiro\                 皮肤文件夹
- Install-Hariiro.cmd      安装程序（实际工作由 Install-Hariiro.ps1 完成）
- components\              Panels UI (reborn) 和 JS Panel 及其许可证
- preview\                 效果图

安装
1. 安装 foobar2000 并启动一次。（如果你已经在使用 foobar2000，请先备份
   profile 文件夹，尤其是其中的 playlists-v2.0。）
2. 把整个压缩包解压到任意文件夹，双击 Install-Hariiro.cmd。
   它会：找到 foobar2000；关闭前先征求同意；若 foobar2000 还没有
   Panels UI (reborn) 和 JS Panel 则自动添加（已安装的不会被替换）；把 Hariiro\
   复制到 <profile>\foo_ui_panels-skins\Hariiro（已有的 Hariiro 文件夹会先复制为
   Hariiro.backup-<时间>）；然后启动 foobar2000。它不会修改 foobar2000 的任何
   设置和播放列表。
   foobar2000 装在特殊位置时：先启动 foobar2000 再运行安装程序，或运行：
   powershell -ExecutionPolicy Bypass -File Install-Hariiro.ps1 -FoobarDir "<文件夹>"
3. 添加组件后首次启动，需要点两下：
   a. 出现 “New user interface module(s) found” 时，选择 “Panels UI (reborn)”，点 OK。
   b. Panels UI 会先打开它自己的布局向导。请使用菜单
      View > Panels UI > Skins（最后一项）> Hariiro。foobar2000 会记住这个选择。

手动安装（不使用安装程序）：安装两个组件（把 components\<名称>\<名称>.dll 复制到
<profile>\user-components-x64\<名称>\，或使用官方的 .fb2k-component 文件），
把 Hariiro 文件夹复制到 <profile>\foo_ui_panels-skins\，然后执行第 3 步。
便携版的 <profile> 是 foobar2000.exe 旁边的 profile 文件夹，普通安装版是
%APPDATA%\foobar2000-v2。

回退：删除 <profile>\foo_ui_panels-skins\Hariiro，把 Hariiro.backup-<时间>
改名回 Hariiro（如有需要，再还原 profile 备份）。

切换语言
- 点击菜单按钮 ☰（右上角，窗口按钮旁边）> 皮肤语言，选择 English、Español、
  Português、简体中文、繁體中文、日本語、Français、Deutsch 或 Русский。
  “跟随系统（默认）”使用 Windows 的显示语言。
- 切换立即生效，作用于 Hariiro 的所有标签、提示和菜单，重启后保留。
- 属于 foobar2000、Panels UI 或 ESLyric 的菜单（foobar2000 菜单栏、中间列表菜单里的
  曲目命令、首选项）沿用 foobar2000 自身的语言。

操作说明
顶栏
- 艺术家 / 播放列表：把左侧栏切换为媒体库中的艺术家或你的播放列表。
  正在播放：跳到正在播放的曲目。
- 搜索框：输入后按 Enter 搜索媒体库，结果放在左侧栏的 “Search Result”。
  框内支持 Ctrl+A / Ctrl+C / Ctrl+V；右键可选 立即搜索、从剪贴板粘贴、清空搜索。
- ☰：Hariiro 设置：迷你播放器（见下文）、显示或隐藏 Windows 标题栏和 foobar2000 菜单栏、foobar2000
  首选项、foobar2000 主菜单、皮肤语言、主题色调、壁纸、界面配色，最后一项“访问作者的 GitHub
  项目（发布页）”会在浏览器中打开项目公开的发布页面。右侧依次是最小化、最大化和
  电源按钮（关闭 foobar2000）。
迷你播放器
- 菜单 ☰ → 迷你播放器：窗口缩成屏幕右上角的小播放器，有封面、曲名、艺术家、播放
  顺序、上一首、播放 / 暂停、下一首、输出设备和进度条。拖动标题即可移动；心形按钮
  把曲目加入 Favorites。右上角的按钮（或双击标题）回到原来大小的完整窗口。它同样
  跟随浅色 / 深色界面。
左侧栏
- 点击一行，在中间列表中显示它。Music Library、Favorites 和 Search Result 固定在
  顶部，下面是你的播放列表。
- Ctrl + 点击选中或取消一个播放列表，Shift + 点击选中一段（中间显示的列表不会变）；
  按 Delete 删除选中的播放列表，没有多选时删除当前列表。普通点击结束多选。
  正在播放、已锁定或被队列引用的列表不会被删除。
- 右键：新建播放列表、重命名播放列表、复制播放列表、移除播放列表、导入音乐文件夹。
- 从资源管理器把文件或文件夹拖到某个播放列表行上即可加入该列表；拖到列表下方的
  空白处会新建一个播放列表。
中间列表（GLASS）
- 单击选中，Ctrl + 单击 / Shift + 单击多选，双击播放。
- 行上的心形按钮把曲目加入或移出 Favorites；“…”（或右键）打开菜单：
  将选中曲目加入播放队列、从播放列表移除选中曲目（保留源文件），以及
  foobar2000 自带的曲目命令。
- Delete 从播放列表移除选中的曲目（不会删除文件）。
- 把曲目拖到左侧栏的播放列表或队列上；从资源管理器拖入文件即可添加。鼠标滚轮滚动。
右侧
- 顶部卡片显示正在播放的曲目：封面、标题、艺术家、专辑。
- 歌词：当前行高亮。上下拖动歌词后松开（或直接点击某一行）即可跳到该处；
  无时间轴的歌词可用滚轮滚动。右键：歌词提前 / 延后 0.5 秒（仅当前曲目）、重置歌词
  偏移、重新加载、打开歌词文件所在位置、选择歌词来源（标签、ESLyric 目录、曲目所在
  文件夹、指定文件夹）以及 ESLyric 相关命令。
- QUEUE（右下角）在歌词位置显示播放队列。把一行拖到另一行上可调整顺序，拖到垃圾桶
  上可移除；队列右上角的按钮清空队列；右键可选 上移 / 下移 / 从队列移除 /
  清空播放队列。把曲目或文件拖到队列上即可加入队列。
- Desk（右下角）开关 ESLyric 桌面歌词（需要 ESLyric）；右键可设置 ESLyric 命令。
底栏
- 从左到右：播放顺序（默认、列表循环、单曲循环、随机播放、曲目洗牌、专辑洗牌）、
  后退 5 秒、上一首、播放 / 暂停、下一首、前进 5 秒、输出设备。
- 进度条和音量条：点击或拖动；鼠标滚轮每次调整 5 秒 / 2.5 dB。
撤销与快捷键
- 删除播放列表、曲目或队列项后，会显示 8 秒的撤销提示。
- Ctrl+Z 撤销最近一次删除（继续按可撤销更早的操作，每个面板最多 20 步）。焦点需在
  左侧栏、中间列表或队列中，搜索框内不生效。
- Delete：删除选中的播放列表（左侧栏）或选中的曲目（中间列表）。

功能
- GLASS 列表：按专辑分组的透明播放列表，带封面、倒影和每首曲目的心形按钮。
- 迷你播放器：带封面、曲目信息、播放控制和进度条的小窗口（菜单 ☰）。
- 左侧栏：艺术家（按媒体库归类）或播放列表，Music Library、Favorites 和
  Search Result 固定在顶部。可新建、重命名、复制、移除播放列表，导入文件夹，
  一次选中多个播放列表。
- 处处可拖放：曲目拖到播放列表或队列；文件和文件夹从资源管理器拖到播放列表、
  中间列表、队列或新播放列表。导入的曲目会自动排序并跳过重复项。
- 在顶栏搜索媒体库，结果放在 Search Result。
- 收藏：曲目或正在播放卡片上的心形按钮。
- 播放队列面板：拖动排序、拖到垃圾桶移除、清空，拖入曲目或文件即可加入队列。
- 正在播放卡片：封面、标题、艺术家、专辑、年份、流派和格式。
- 歌词：支持带时间轴和纯文本歌词，来源可以是 ESLyric 保存的文件、曲目所在文件夹、
  指定文件夹或标签；拖动跳转到某一行；按曲目提前或延后 0.5 秒；开关 ESLyric 桌面
  歌词（Desk）。
- 底栏：播放顺序、前进 / 后退 5 秒、上一首、播放 / 暂停、下一首、输出设备、进度条
  和音量。
- 撤销：被删除的播放列表、曲目和队列项可通过 8 秒提示或 Ctrl+Z 恢复。
- 菜单 ☰ → 主题色调：images\controls 中的每个文件夹都是一种颜色，以文件夹名显示
  （自带六种：amber、blue、mint、pink、teal、violet）。复制一个文件夹，改掉其中的
  图片和 theme.json，就会出现在菜单里。边角、边框、按钮和文字都会跟随所选颜色。
- 菜单 ☰ → 壁纸：皮肤文件夹 images\wallpapers 中的每个 .jpg / .png / .bmp 文件，
  以文件名显示（自带两张 Hariiro_UI 壁纸）。删除文件后它会从菜单中消失；如果正在
  使用，会自动换成另一张。
- 菜单 ☰ → 界面配色：“自动”（默认）在选择壁纸时读取它的明暗：浅色壁纸使用浅色界面
  （浅色磨砂玻璃、深色文字和图标），深色壁纸使用原来的深色玻璃。选“深色”或“浅色”则
  不论壁纸如何都固定使用该样式。
- 九种语言：English、Español、Português、简体中文、繁體中文、日本語、Français、
  Deutsch、Русский（菜单 ☰ → 皮肤语言）。
- 显示或隐藏 Windows 标题栏和 foobar2000 菜单栏（菜单 ☰）。
- 播放音乐时 CPU 和内存占用低。
- 安装程序，附带 Panels UI (reborn) 和 JS Panel。

已知限制
- 无法嵌入 ESLyric 自己的面板；皮肤显示的是 ESLyric 已保存的歌词（或标签中的歌词）。
  在线搜索仍在 ESLyric 中进行。
- 浅色界面需要色调文件夹里有 light\ 子文件夹（自带的色调都有；可用
  tools/make_light_controls.py 生成）。没有时，控件使用原来的图片。
- foobar2000 所在文件夹的路径只能包含 Windows 当前代码页支持的字符（英文字母、数字
  和空格总是安全的，例如 D:\Program\foobar2000）。否则 JS Panel 无法读取皮肤脚本，
  皮肤会显示空白，例如在日文 Windows 上使用简体中文文件夹名。
- 尚未在 Windows 上测试：125 % / 150 % 显示缩放、在缩放比例不同的显示器之间移动
  窗口、搜索框中日文输入法的未确定文字。

更新
- 再次运行 Install-Hariiro.cmd（或在关闭 foobar2000 后把 Hariiro 文件夹复制到
  皮肤文件夹上覆盖）。设置、播放列表和皮肤自己的列表都会保留。
- 如果你的 Hariiro 皮肤不在 <profile>\foo_ui_panels-skins 中，请在
  View > Panels UI > Skins 中选择一次新的位置。
- 如果移动过 foobar2000 文件夹，Panels UI 会显示一次欢迎页：请重新选择皮肤文件夹
  （foo_ui_panels-skins\Hariiro）。

从测试版升级
- 1.0.0 是以 Hariiro 为名的第一个正式版。早期测试版（使用另一个名字）的设置、窗口
  属性和皮肤自有的播放列表不会沿用：皮肤以默认设置启动，并创建自己的播放列表
  “Favorites”、“Queue Buffer”、“Search Results”、“Sorted Library View”、
  “Artist View” 和 “Import Staging”。如果你已有同名的播放列表，皮肤会直接把它当作
  对应的列表使用。
- 测试版的旧播放列表会作为普通播放列表保留在 foobar2000 中。要保留收藏，请把旧
  Favorites 列表中的曲目复制到 “Favorites”，再删除不再需要的旧列表。
- 请安装到一个新的空皮肤文件夹（例如 foo_ui_panels-skins\Hariiro）并在 Panels UI
  中选择它，不要覆盖在测试版上。
