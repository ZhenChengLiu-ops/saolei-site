/* ================== AI 辅助新增 (2026-10-29) ==================
 * 网页版"简单扫雷"——逐函数复刻 C 版 game.c(单格翻开版,无连锁展开)的逻辑。
 * 每个 JS 函数开头的注释都会标明"对应 C 版的哪个函数",方便对照学习 JS。
 * 与 C 版的差异只有两种:
 *   1. 输入输出方式不同:C 用 scanf/printf 打到终端,网页用鼠标点击/DOM 渲染;
 *   2. C 用 srand(time(NULL)) 做随机种子,JS 的 Math.random 每次天然不同,无需种子。
 * 游戏逻辑(数字棋盘 11x11 含边框、查重埋雷、8 邻数雷、单格翻开、
 * goal==Row*Col-Mine_Count 判胜、输赢提示文字)与 C 版完全一致。
 * ==============================================================
 */

/* ========== 对应 game.h 的宏定义 ========== */
const Row = 9;         // AI辅助:对应 #define Row 9(棋盘内圈行数)
const Col = 9;         // AI辅助:对应 #define Col 9
const Rows = Row + 2;  // AI辅助:对应 #define Rows (Row+2)=11——数组仍是11x11含边框,只是网页不渲染第0行/列
const Cols = Col + 2;  // AI辅助:对应 #define Cols (Col+2)=11
const Mine_Count = 10; // AI辅助:对应 #define Mine_Count 10(埋雷个数)

/* ========== 棋盘数据(对应 main 里 game() 的两个局部二维数组) ========== */
// C 版是需要开在函数里的局部数组;网页一段剧情里多次点击共享状态,
// 所以这里升为全局变量,每次 startGame 时重新初始化(等价于重新进 game())
let ingame = [];   // AI辅助:对应 char ingame[Rows][Cols] ——雷区信息,'0'无雷 '1'有雷
let showgame = []; // AI辅助:对应 char showgame[Rows][Cols] ——翻牌区,'*'未翻,数字已翻
let goal = 0;      // AI辅助:对应 search_game 里的 int goal(局部),提升为全局以便多次点击累计
let gameOver = false; // AI辅助:对应 C 版 while(1) 里的 break——胜负出来后停止响应后续点击

/* ================== 对应 game.c 的 input_game ================== */
// C: void input_game(char game[Rows][Cols],int r,int c,char sym)
// 把整个 Rows x Cols 数组填成同一个字符 sym('0' 或 '*')
function input_game(game, r, c, sym) {
	for (let i = 0; i < r; i++) {
		game[i] = []; // AI辅助:C 里一次声明二维数组;JS 需要"先建行数组再填值"
		for (let j = 0; j < c; j++) {
			game[i][j] = sym;
		}
	}
}

/* ============== 对应 game.c 的 input_mine ============== */
// C: void input_mine(char game[Rows][Cols], int row, int col)
// C 用 rand()%row+1 产生 1..row 的随机坐标;JS 用 Math.floor(Math.random()*row)+1,
// 两种写法等价(Math.random() 是 [0,1) 的小数)。查重逻辑与 C 完全一致:
// 只有目标是'0'(没埋过)才埋,埋够 Mine_Count 颗为止。
function input_mine(game, row, col) {
	let count = Mine_Count; // AI辅助:同 C,统一用 game.h 的宏
	while (count > 0) {
		const x = Math.floor(Math.random() * row) + 1;
		const y = Math.floor(Math.random() * col) + 1;
		if (game[x][y] === '0') { // AI辅助:同 C 的查重判断,保证不重复埋雷
			game[x][y] = '1';
			count--;
		}
	}
}

/* ============== 对应 game.c 的 num_mine ============== */
// C: int num_mine(char i_game[Rows][Cols], int x, int y)
// C 版把周围 8 格字符值相加再减 8*'0'得到雷数;JS 里我们逐格检查是否为'1'再计数,
// 结果与 C 版相同(都是数出行雷个数,返回 0~8),只是语言习惯不同。
// 边框数组(ingame 边框一圈全是'0')保证了 x=1/9 等角格也不会越界,与 C 版同理。
function num_mine(i_game, x, y) {
	let count = 0;
	for (let i = x - 1; i <= x + 1; i++) {
		for (let j = y - 1; j <= y + 1; j++) {
			if (i === x && j === y) {     // 八邻域不含自己一格
				continue;
			}
			if (i_game[i][j] === '1') {   // '1' 是雷
				count++;
			}
		}
	}
	return count;
}

/* ============== 对应 game.c 的 print_game ============== */
// C: void print_game(char game[Rows][Cols], int r, int c)
// C 版把棋盘 printf 到终端;网页版把二维数组渲染成 9x9 的 DOM 格子。
// 参数 board 取值为:
//   'show'   ——渲染 showgame(游戏进行中: '*' 或已翻开的数字),对应 print_game(s_game,...)
//   'ingame' ——渲染 ingame(失败后展示完整雷区),对应失败时的 print_game(i_game,...)
// 说明: C 版打印有列标题/行号,方便终端玩家输入坐标;网页用鼠标点击格子,
// 坐标天然已知,所以不需行号辅助(这是唯一一处"显示方式"上的合理简化,逻辑无差别)。
function print_game(board, mode) {
	const box = document.getElementById("board");
	box.innerHTML = ""; // 清空旧格子,整体重画(等价于 C 版每次整盘打印)
	box.style.gridTemplateColumns = `repeat(${Col}, 38px)`;

	for (let i = 1; i <= Row; i++) {
		for (let j = 1; j <= Col; j++) {
			const cell = document.createElement("div");
			cell.className = "cell";
			cell.dataset.x = i; // 把坐标存在格子上,点击时直接取用(等效 C 里玩家手敲 x,y)
			cell.dataset.y = j;

			if (board === showgame) {
				cell.textContent = showgame[i][j]; // '*' 或已翻开的数字,原样显示(含 '0'，保持 C 版风格)
				if (showgame[i][j] !== '*') {
					cell.classList.add("opened");               // 已翻开格变平
					cell.classList.add("n" + showgame[i][j]);   // 数字配色给 n1~n8 类
				}
				cell.addEventListener("click", function () {
					dig(Number(this.dataset.x), Number(this.dataset.y));
				});
			} else { // 渲染 ingame(失败后展示全雷区)
				cell.textContent = ingame[i][j];
				if (ingame[i][j] === '1') {
					cell.classList.add("mine"); // 雷格标红
				}
			}
			box.appendChild(cell);
		}
	}
}

/* ============== 辅助函数:更新状态提示区 ============== */
// 对应 C 版 search_game 里各处 printf 提示(input coordinate / input again /
// Please input again / you lost!!! / Win!!!)——C 打到终端,网页写到 status 区
function setStatus(text) {
	document.getElementById("status").textContent = text;
}

/* ================== 对应 game.c 的 search_game ================== */
// C 版是 while(1){ scanf 坐标 → 校验 → 翻开/判负/判胜 } 的死循环;
// 网页版把"循环体"变成参数为坐标(x,y)的函数,每次点击格子调用一次。
// 对应关系:
//   scanf 失败分支(illegal input)      → 网页点击不可能产生非法输入,天然不存在
//   if(x>=1&&&&x<=row...) 校验          → 点击只会落在 1..Row/1..Col 内,天然满足
//   else printf("Please input again")  → 同上,不可达(保留注释仅为映射)
//   else printf("input again")         → 已翻开的格子,提示后返回
//   i_game[x][y]=='1' → you lost!!!    → 踩雷,渲染雷区,gameOver=true 对应 break
//   非雷 → 单格翻开+goal++ → Win!!!    → 与复原后的 C 版完全一致(无连锁展开)
function dig(x, y) {
	if (gameOver) { // AI辅助:对应 C 版 break 之后 while 循环已退出,不再摄理输入
		return;
	}
	// 对应 if(s_game[x][y]=='*') 的 else 分支: 这格已经翻过
	if (showgame[x][y] !== '*') {
		setStatus("input again");
		return;
	}
	// 对应 else if(i_game[x][y]=='1'): 踩到雷
	if (ingame[x][y] === '1') {
		setStatus("you lost!!!");
		print_game(ingame, "ingame"); // AI辅助:对应失败时打印完整雷区,C 代码 print_game(i_game, row, col)
		gameOver = true;              // 对应 C 的 break
		document.getElementById("btn-replay").classList.remove("hidden");
		return;
	}
	// 对应非雷分支: s_game[x][y]=(char)(num_mine(...)+'0'); print; goal++;
	// 注意:严格单格翻开,不向外扩散(与你的 C 复原版一致)
	showgame[x][y] = String(num_mine(ingame, x, y)); // JS 里 (字符拼 '0') 等价的写法是转字符串
	print_game(showgame, "show");
	goal++;
	// 对应 C: if(goal == Row*Col - Mine_Count) printf("Win!!!")
	if (goal === Row * Col - Mine_Count) {
		setStatus("!!!");
		gameOver = true; // 对应 break
		document.getElementById("btn-replay").classList.remove("hidden");
	}
}

/* ================== 对应 Test_2026_10_28.c 的 game() ================== */
// C: void game(){ input_game(...'0'); input_game(...'*'); print_game(showgame);
//             input_mine(...); search_game(...); }
// 网页版把"先把全'*'棋盘打印出来、再埋雷"的两次终端打印合并为埋雷后渲染一次
// (玩家看到的最终效果一样: 开局是全'*'的 9x9 棋盘)。
function startGame() {
	ingame = [];
	showgame = [];
	goal = 0;         // AI辅助:对应局部 int goal=0(每局重置)
	gameOver = false; // AI辅助:对应每局重新进入 while(1)

	input_game(ingame, Rows, Cols, '0');   // 对应 input_game(ingame, Rows, Cols, '0')
	input_game(showgame, Rows, Cols, '*'); // 对应 input_game(showgame, Rows, Cols, '*')
	input_mine(ingame, Row, Col);          // 对应 input_mine(ingame, Row, Col)
	print_game(showgame, "show");          // 对应 print_game(showgame, Row, Col)(开局全'*')
	setStatus("input coordinate");         // 对应进入 search_game 后第一次 printf 提示
	document.getElementById("btn-replay").classList.add("hidden");
}

/* ================== 对应 main()/menu()/case 分支的界面调度 ================== */
// C 的 main 用 do-while 循环 + switch(choose) 处理菜单;
// 网页用"只显示一个界面"的方式等价表达: 切 view 就是一次"回到 menu 选新选项"
function showView(id) {
	document.querySelectorAll(".view").forEach(function (v) {
		v.classList.add("hidden");
	});
	document.getElementById(id).classList.remove("hidden");
}

// AI辅助: 页面加载时绑定按钮事件(对应 switch(choose) 的三路分支)
document.getElementById("btn-play").addEventListener("click", function () {
	showView("game-view");
	startGame();  // 对应 case 1: game()
});
document.getElementById("btn-leave").addEventListener("click", function () {
	showView("bye-view"); // 对应 case 0: printf("Bye Bye!!") 后退出游戏循环
});
// "再来一局(play)" = 回到菜单再点一次 play(对应 do-while 循环的下一轮)
document.getElementById("btn-replay").addEventListener("click", function () {
	startGame();
});
