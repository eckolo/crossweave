using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

public partial class GameScreen
{
    /// <summary>人比較の候補だけを同じGodot rendererで描く。通常起動からは呼べない。</summary>
    internal Control MountainReviewFigure(JsonArray definition)
    {
        if(Automation is null)throw new InvalidOperationException("候補表示は隔離検査専用です。");
        var panel=Surface(this,new(480,240,960,480),"f1f1e8","bbc7bb",1,10);
        Strong(Text(panel,"H11：Mountainの2用途（候補は未採用）",new(24,16,912,40),24));
        Text(panel,"現在の本編",new(80,74,300,30),20);Text(panel,"既存Lucide 1.8.0の候補",new(520,74,380,30),20);
        // 検査専用の一時キーで既存SVG描画器を再利用する。製品のTriangleや
        // 原本subset、保存の属性は差し替えない。texture生成後に定義を取り除く。
        const string candidate="review-candidate-Mountain";acceptedIcons[candidate]=definition.DeepClone();
        try
        {
            Text(panel,"主体：64px／stroke 1.5",new(24,126,400,30),18);
            Icon(panel,"Triangle",new(140,170,64,64),stroke:1.5f);var large=Icon(panel,candidate,new(600,170,64,64),stroke:1.5f);Controls["human-mountain-64"]=large;
            Text(panel,"行動順：候補12px／stroke 2",new(24,266,430,30),18);
            var current=Text(panel,"△",new(162,322,22,22),12);current.HorizontalAlignment=HorizontalAlignment.Center;
            var small=Icon(panel,candidate,new(626,327,12,12));Controls["human-mountain-12"]=small;
            Text(panel,"同じ実Main・暗色・書体・倍率。候補の採用、通常UIの変更、ゲーム操作は行いません。",new(24,408,912,40),18);
        }
        finally{acceptedIcons.Remove(candidate);}
        return panel;
    }
}
