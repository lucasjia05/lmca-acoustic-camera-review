"""Regenerate review figures from the audit results, saved maps, and trial counts."""
import argparse
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap, Normalize
from matplotlib.cm import ScalarMappable
from matplotlib.lines import Line2D
import numpy as np

ROOT = Path(__file__).resolve().parent
TEAL, ORANGE, SLATE, GRAY = "#037b79", "#bb541e", "#405e90", "#707471"
INK, LINE = "#162b35", "#dbe3e3"
plt.rcParams.update({"font.family":["DejaVu Sans","Arial","sans-serif"],"font.size":10,"text.color":INK,"axes.labelcolor":INK,
    "xtick.color":INK,"ytick.color":INK,"svg.fonttype":"none","svg.hashsalt":"lmca-inspection","axes.spines.top":False,"axes.spines.right":False})

def save(fig,name):
    target=ROOT/(name+".svg")
    fig.savefig(target,bbox_inches="tight",pad_inches=.15,metadata={"Date":None})
    text=target.read_text(encoding="utf8")
    target.write_text("\n".join(line.rstrip() for line in text.splitlines())+"\n",encoding="utf8",newline="\n")
    plt.close(fig)

def bench():
    data=json.loads((ROOT/"benchmark.json").read_text())
    maps=np.load(ROOT/"gallery.npz")
    keys=list(data["axes"])
    # The legend uses the same ordering and colors as the website comparisons.
    theta=np.linspace(0,2*np.pi,len(keys),endpoint=False)
    fig,ax=plt.subplots(figsize=(7.2,5.0),subplot_kw=dict(projection="polar"))
    ax.set_theta_offset(np.pi/2);ax.set_theta_direction(-1)
    ax.set_xticks(theta,["Weak bursts","Frequency\ncoverage","Environmental\nnoise","Drone\ninterference","Field of view","Two sources"])
    ax.tick_params(axis="x",pad=13,labelsize=10)
    ax.set_ylim(0,100);ax.set_yticks([25,50,75,100],["25%","50%","75%","100%"],fontsize=8)
    ax.set_rlabel_position(25);ax.spines["polar"].set_color(LINE);ax.grid(color=LINE)
    for k,color,style in [("reference",GRAY,":"),("control",SLATE,"--"),("coverage",ORANGE,"-"),("balanced",TEAL,"-")]:
        rates={r["axis"]:100*r["passed"]/r["total"] for r in data["scores"] if r["design"]==k}
        y=[rates[a] for a in keys];ax.plot(np.r_[theta,theta[0]],y+[y[0]],lw=2,color=color,ls=style,marker="o",ms=3)
    handles=[Line2D([0],[0],color=c,lw=2,ls=l,label=t) for c,l,t in [(TEAL,"-","40 mics / 16 bins"),(ORANGE,"-","30 mics / 22 bins"),(SLATE,"--","Earlier 30 / 10"),(GRAY,":","All-bin float reference")]]
    fig.legend(handles=handles,loc="lower center",bbox_to_anchor=(.5,-.075),ncol=2,frameon=False)
    save(fig,"benchmark")
    colors=LinearSegmentedColormap.from_list("acoustic_power",[
        (0,"#0b1223"),(.28,"#171c39"),(.44,"#2d2753"),(.57,"#584070"),
        (.68,"#ac5976"),(.81,"#f3985c"),(.91,"#ffdc91"),(1,"#fffbd6")])
    for scene,meta in data["scenes"].items():
        for key,title in [("balanced","40 mics · 16 bins"),("coverage","30 mics · 22 bins"),("control","Earlier 30 · 10"),("reference","30 mics · all bins (float)")]:
            dirs=maps["directions_"+key];p=maps[scene+"_"+key]
            az,el=[np.unique(z) for z in dirs.T]
            fig,ax=plt.subplots(figsize=(2.9,2.6))
            ax.pcolormesh(az,el,10*np.log10(np.maximum(p.reshape(len(az),len(el)).T,1e-30)),
                          shading="nearest",vmin=-82,vmax=-35,cmap=colors,rasterized=True)
            ax.set(xlim=(-30,30),ylim=(-30,30),aspect="equal",xticks=[-30,0,30],yticks=[-30,0,30])
            ax.tick_params(labelsize=10,length=2)
            for x,y in meta["truths"]:
                ax.plot(x,y,marker="o",fillstyle="none",mec="black",mew=2.7,ms=8)
                ax.plot(x,y,marker="o",fillstyle="none",mec="#82fffc",mew=1.4,ms=8)
            if max(p)>data["thresholds"][key]:
                x,y=dirs[np.argmax(p)];ax.plot(x,y,"k+",ms=9,mew=3);ax.plot(x,y,"w+",ms=9,mew=1.4)
            save(fig,"map-"+scene+"-"+key)
    fig,ax=plt.subplots(figsize=(4,.27))
    cb=fig.colorbar(ScalarMappable(norm=Normalize(-82,-35),cmap=colors),cax=ax,orientation="horizontal",ticks=[-82,-70,-60,-50,-40,-35])
    cb.ax.tick_params(labelsize=8);cb.outline.set_visible(False)
    save(fig,"map-scale")

def gate_charts():
    audit=json.loads((ROOT/"audited-gates.json").read_text())
    extra=json.loads((ROOT/"new-gates.json").read_text())
    rows={r["key"]:r for r in audit["rows"]+extra["rows"]}
    def panel(name,sets,xkey,xlabel):
        fig,ax=plt.subplots(figsize=(7.5,3.65),layout="constrained")
        for (label,ids),color in zip(sets,[TEAL,ORANGE,SLATE]):
            subset=[rows[k] for k in ids];x=[r[xkey] for r in subset];y=[r["gates"]/1000 for r in subset]
            ax.plot(x,y,"o-",color=color,linewidth=1.4,ms=6,label=label)
            for xx,yy in zip(x,y): ax.annotate(f"{yy:.1f}k",(xx,yy),xytext=(0,8),textcoords="offset points",ha="center",fontsize=8,color=color)
        low,high=ax.get_ylim();ax.set_ylim(min(low-6,282),max(high+10,309))
        ax.axhline(295,ls="--",color="#8b5750",lw=1,label="295k working budget",zorder=0)
        ax.set_ylabel("Thousands of NAND2 equivalents");ax.set_xlabel(xlabel);ax.grid(axis="y",color=LINE);ax.set_axisbelow(True)
        ax.set_xticks(sorted({rows[k][xkey] for _,ids in sets for k in ids}))
        ax.legend(loc="upper center",bbox_to_anchor=(.5,-.20),ncol=3,fontsize=9,frameon=False)
        save(fig,"gates-"+name)
    panel("bins",[("30 mics · 3°",["k14","k18","k20","k21","k22","k23"]),
                  ("30 mics · 1.5°",["fine18","fine20","fine22"]),("40 mics · 1.5°",["m40fine14","m40fine16"])],"bins","Selected frequency bins")
    panel("mics",[("14 bins · 3°",["k14","m40k14"]),("18 bins · 3°",["k18","m36k18"])],"mics","Microphones on a 200 mm spiral")
    panel("width",[("30 mics · 18 bins · N256",["k18","width26","width28"])],"width","Accumulator width (bits), with 15 fractional bits")
    panel("window",[("30 mics · 18 bins · 28-bit accumulators",["width28","window512","window1024"])],"window","Samples per window, same 18 physical frequencies")
    panel("grid",[("30 mics · 18 bins",["fine18","k18"]),("30 mics · 22 bins",["fine22","k22"]),
                  ("40 mics · 14 bins",["m40fine14","m40k14"])],"step","Scan spacing (degrees)")
    panel("filter",[("30 mics · 18 bins",["k18","notch18","bp9k18"]),("30 mics · 14 bins",["k14","bp17k14"])],"fir","FIR taps (1 = identity, 3 = notch, 9/17 = band-pass)")

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("kind",choices=["bench","gates"]);args=p.parse_args()
    (bench if args.kind=="bench" else gate_charts)()
