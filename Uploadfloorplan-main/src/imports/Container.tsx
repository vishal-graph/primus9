import imgImage3DCorner from "figma:asset/d21f94f51644333a2699ea1974b6862b9245bc01.png";
import imgIcon from "figma:asset/25f7a0f01b3657ba23b03de42d4e77192f38e0b9.png";
import imgIcon1 from "figma:asset/6f35b1c63894b6b8e5fe71dcfc3210d690b10948.png";
import imgIcon2 from "figma:asset/7c7a2fc278403feb4818133f501f8057878144d8.png";

function Image3DCorner() {
  return (
    <div className="h-[36.054px] relative shadow-[0px_10px_50px_0px_rgba(0,0,0,0.5),0px_0px_40px_0px_rgba(255,255,255,0.08)] shrink-0 w-[35.5px]" data-name="Image (3D Corner)">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[133.13%] left-[-59.15%] max-w-none top-[-16.57%] w-[202.82%]" src={imgImage3DCorner} />
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="absolute content-stretch flex h-[37px] items-center justify-center left-[52px] top-[17px] w-[36px]" data-name="Container">
      <Image3DCorner />
    </div>
  );
}

function Container4() {
  return <div className="absolute blur-[20px] left-[-14px] opacity-0 size-[60.038px] top-[-14px]" data-name="Container" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\'0 0 60.038 60.038\' xmlns=\'http://www.w3.org/2000/svg\' preserveAspectRatio=\'none\'><rect x=\'0\' y=\'0\' height=\'100%\' width=\'100%\' fill=\'url(%23grad)\' opacity=\'1\'/><defs><radialGradient id=\'grad\' gradientUnits=\'userSpaceOnUse\' cx=\'0\' cy=\'0\' r=\'10\' gradientTransform=\'matrix(0 -4.2453 -4.2453 0 30.019 30.019)\'><stop stop-color=\'rgba(255,255,255,0.06)\' offset=\'0\'/><stop stop-color=\'rgba(0,0,0,0)\' offset=\'0.7\'/></radialGradient></defs></svg>')" }} />;
}

function Icon() {
  return (
    <div className="h-[32.235px] relative shadow-[0px_6px_28px_0px_rgba(0,0,0,0.35)] w-[34px]" data-name="Icon">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[146.75%] left-[-52.41%] max-w-none top-[-23.37%] w-[208.49%]" src={imgIcon} />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-0 pr-[0.133px] shadow-[0px_0px_0.108px_0px_rgba(255,255,255,0)] size-[32.02px] top-0" data-name="Container">
      <div className="flex h-[32.377px] items-center justify-center relative shrink-0" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "18" } as React.CSSProperties}>
        <div className="flex-none rotate-[0.24deg] skew-x-[0.24deg]">
          <Icon />
        </div>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="absolute left-[-2.01px] opacity-60 size-[32.02px] top-[-2.09px]" data-name="Container">
      <Container4 />
      <Container5 />
    </div>
  );
}

function Container2() {
  return (
    <div className="absolute left-[128px] size-[28px] top-[22px]" data-name="Container">
      <Container3 />
    </div>
  );
}

function Container8() {
  return <div className="absolute blur-[20px] left-[-14px] opacity-5 size-[60.544px] top-[-14px]" data-name="Container" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\'0 0 60.544 60.544\' xmlns=\'http://www.w3.org/2000/svg\' preserveAspectRatio=\'none\'><rect x=\'0\' y=\'0\' height=\'100%\' width=\'100%\' fill=\'url(%23grad)\' opacity=\'1\'/><defs><radialGradient id=\'grad\' gradientUnits=\'userSpaceOnUse\' cx=\'0\' cy=\'0\' r=\'10\' gradientTransform=\'matrix(0 -4.2811 -4.2811 0 30.272 30.272)\'><stop stop-color=\'rgba(255,255,255,0.06)\' offset=\'0\'/><stop stop-color=\'rgba(0,0,0,0)\' offset=\'0.7\'/></radialGradient></defs></svg>')" }} />;
}

function Icon1() {
  return (
    <div className="h-[32px] relative shrink-0 w-[28px]" data-name="Icon">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[134.54%] left-[-70.09%] max-w-none top-[-18.37%] w-[230.64%]" src={imgIcon1} />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-0 shadow-[0px_0px_3.209px_0px_rgba(255,255,255,0.04)] size-[32.29px] top-0" data-name="Container">
      <Icon1 />
    </div>
  );
}

function Container7() {
  return (
    <div className="absolute left-[-2.15px] opacity-64 size-[32.29px] top-[-3.23px]" data-name="Container">
      <Container8 />
      <Container9 />
    </div>
  );
}

function Container6() {
  return (
    <div className="absolute left-[196px] size-[28px] top-[22px]" data-name="Container">
      <Container7 />
    </div>
  );
}

function Container12() {
  return <div className="absolute blur-[20px] left-[-14px] opacity-25 size-[62.318px] top-[-14px]" data-name="Container" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\'0 0 62.318 62.318\' xmlns=\'http://www.w3.org/2000/svg\' preserveAspectRatio=\'none\'><rect x=\'0\' y=\'0\' height=\'100%\' width=\'100%\' fill=\'url(%23grad)\' opacity=\'1\'/><defs><radialGradient id=\'grad\' gradientUnits=\'userSpaceOnUse\' cx=\'0\' cy=\'0\' r=\'10\' gradientTransform=\'matrix(0 -4.4066 -4.4066 0 31.159 31.159)\'><stop stop-color=\'rgba(255,255,255,0.06)\' offset=\'0\'/><stop stop-color=\'rgba(0,0,0,0)\' offset=\'0.7\'/></radialGradient></defs></svg>')" }} />;
}

function Icon2() {
  return (
    <div className="h-[28px] relative shrink-0 w-[30px]" data-name="Icon">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[144.51%] left-[-59.71%] max-w-none top-[-25.23%] w-[199.42%]" src={imgIcon2} />
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="absolute content-stretch flex h-[28px] items-center justify-center left-0 shadow-[0px_0px_15.912px_0px_rgba(255,255,255,0.17)] top-0 w-[30px]" data-name="Container">
      <Icon2 />
    </div>
  );
}

function Container11() {
  return (
    <div className="absolute h-[28px] left-[-3px] opacity-80 top-[-7px] w-[30px]" data-name="Container">
      <Container12 />
      <Container13 />
    </div>
  );
}

function Container10() {
  return (
    <div className="absolute h-[21px] left-[264px] top-[29px] w-[28px]" data-name="Container">
      <Container11 />
    </div>
  );
}

export default function Container() {
  return (
    <div className="relative size-full" data-name="Container">
      <Container1 />
      <Container2 />
      <Container6 />
      <Container10 />
    </div>
  );
}