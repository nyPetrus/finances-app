import { ImageResponse } from "next/og";
import { APP_ICON_DATA_URI } from "@/lib/app-icon";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={APP_ICON_DATA_URI} width={size.width} height={size.height} alt="" />,
    { ...size },
  );
}
