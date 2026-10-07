# 専用desktop継承案の前提検査（2026-10-08）

検討・検証を実施した。今回の実行経路では専用desktopが提供されていることを確認できず、Godot起動前に停止した。Python子とPowerShell親の両方で、実測は `WinSta0\Default`、`UOI_IO=true`、入力desktopも `Default`。通常作業画面への影響を避ける条件が成立しない。

対象は既存Work `20260927-game-application`、既存枝 `impl/m1-godot-application-20260927`。利用者の「では専用デスクトップの継承で検討・検証してみて」を受領して、Windows APIの読取り診断を行った。新Work・新枝・並列実装・他Workへの送信なし。Cloud移行、サンドボックス外実行、設定や権限範囲の変更は行っていない。

## 実施対象・手段・停止地点

対象は、同じ本編・固定入力を代表状態で実描画する前に、検査プロセスのdesktop継承元を確定すること。新規desktopを作らず、現在threadのdesktop、processのwindow station、入力desktopを読み、専用desktopとして使えるかを判定した。

[実測原票](desktop-inspection.json)の `GetThreadDesktop`／`GetProcessWindowStation`／`GetUserObjectInformationW(UOI_NAME,UOI_IO)` と、読取り専用の `OpenInputDesktop` の結果が根拠。`UOI_IO=true` は現在のdesktopが利用者の入力を受ける状態を示す。名前だけで専用desktopと推定していない。

UOI_IOの意味は[Microsoft公式API仕様](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getuserobjectinformationw)を参照する。

Python子への継承だけが落ちた可能性を切り分けるため、[PowerShell親の原票](parent-desktop-inspection.json)も同じWindows APIで測定した。親も入力desktop上で、専用desktopにいる親から継承する前提はこの実行経路では不成立。2つの原票はそれぞれのツール実行で測定し、同じ時点の親子processを追跡した記録とはしない。

停止地点はdesktopの前提確認、Godot／UiProbeの起動前。`CreateDesktopW`、`SetThreadDesktop`、`SwitchDesktop`、前面化、マウス／キー入力は実行していない。本編のPNG／nodes、GPU初期化結果、ウィンドウ作成の成否は未取得。今回のAPI読取り成功を描画成功へ読み替えない。

実行要求はツールの `use_default`。原票の `sandbox_execution` はこの要求の文脈を示し、Windowsの有効sandbox方式をAPIで測定した値ではない。実行時のsandbox方式・token・全設定は未特定。

## 設定と実測の相違

[設定の限定読取り](config-inspection.json)では、ユーザー設定のWindows sandboxは `elevated`、`sandbox_private_desktop` は明示なし。リポジトリ内 `.codex` ディレクトリはない。設定ファイルの読取りは有効設定の証明ではない。

[OpenAI公式資料](https://learn.chatgpt.com/docs/windows/windows-sandbox)は専用desktopが既定と説明しているが、今回のプロセスは入力desktop上だった。設定の未反映、管理・プロファイル等の上書き、実行経路の対応差は原因候補であり、いずれも未特定。公式の一般説明をこの環境の実測に代用しない。前の成算比較は「専用desktopが実際に提供される」条件付きであり、この経路では条件が不成立。

## 保全・固定対象

GitHub枝HEADは開始時 `e75b71d618a521dd07f4b6f90329aa13cb2271f9`、ローカルGit HEADは `0ec6334254db00ebc7956b4df493f3a34b98845a`。本編候補 `a01c5c2762de1cfce602f4547818b29dc3d13e10` の9コードは変更しない。

計画 `5c61d64a`、技術 `21ddd349`、UI `ab1b6fa0` は前回から変更なし。[枝の読戻し](source-refs.json)と[実ファイルの保全・77計画blob／9本編blob再照合](retained-state.json)へ記録する。計画枝や技術枝の全体マージは行わない。

## 再開条件と次担当

1. Codex実行経路側で、検査プロセスへ専用desktopが実際に提供される条件を確認する。本Workは同じ読取り診断を再実行し、入力desktop上なら起動しない。実行環境条件は利用者／実行基盤・配布へ確認案として返す。自動送信しない。
2. 専用desktopが成立しても、既定の検査セーブ `user://proofs/d04b-ui-save-01/` は現在の書込み許可範囲外。保存権限条件を別途受領してから同じ合法入力の代表描画へ進む。新しい保存先や権限範囲を無断で用意・試行しない。
3. Godot起動後のウィンドウ作成、GL初期化、同状態PNG／nodes／入力・ソース一致を検証する。ここは本Workの必要検査として残る。

設定変更、別の実行経路、Cloud、サンドボックス外実行は、理由・範囲・影響を提示して明示承認を得る前に準備・試行しない。

今回の前提検査の記録範囲は実施済み。継承起動／実描画は未成立、D04B-UI-02の提出範囲・全体、UI適合・配布・実機・人の試遊・M1は未完了。H11開始0/16、H12/H13未回答、契約・原本・取得停止の依存は前回票のまま維持する。

## 保存・読戻し

診断・保全・引継ぎ16ファイルを同枝へ通常FF保存した成果は `15eaf48777aaf43625f7573308b2b33919ec5f3c`。16全文/blob、親e75b71d6、commitのtree SHA c1b5a4a7、枝HEADが一致した。[読戻し原票](publication-readback.json)を参照する。

tree全体本文を要求する同じGitHubプラグインの `/git/trees/c1b5a4a7a815c8a7b02ca536343540e23a3ac870?recursive=1` はTransport closed。単独再試行でも同じため、全tree本文の受領は未了。tree SHA一致を全tree本文受領へ読み替えない。別API／非recursive分割・別経路の準備／試行は行わない。今回の最終読戻し票を含む後続コミットは最終応答とGitHub履歴で固定する。

## コードを読む順と失敗時の状態

[inspect_desktop.py](verification/inspect_desktop.py)はPython標準ctypesからWindows APIを読む診断コード。Godotの描画処理、C#/.NETの本編・保存処理とは別で、本作の検査開始条件だけを判定する。API型宣言→名前と入力状態の読取り→原票作成→不成立時の終了、の順に読む。取得した入力desktopのhandleだけを閉じ、親から継承したhandleは閉じない。API失敗はerrnoを記録し、未取得を合格へ補完しない。

[inspect_parent_desktop.ps1](verification/inspect_parent_desktop.ps1)はPowerShell自身の同じ前提を読む。Add-Type内のC#/.NETはP/Invokeの型宣言とWindows API読取りだけで、Godotには接続しない。managedメモリを確保してAPI値を読み、finallyで解放する。取得した入力desktopのhandleだけを閉じる。API／型生成失敗は原票に例外を記録し、子側の値で穴埋めしない。

[retain_current_state.py](verification/retain_current_state.py)は保全用Python。Git HEAD／差分→既存未追跡全ファイルのSHA256→本編9／計画77blobの照合、の順に読む。前回完全台帳と今回差分を結び、通常保存・旧証拠を変更しない。読取り失敗やblob不一致は停止し、実ファイルを修復したことにしない。
