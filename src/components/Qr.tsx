import QRCode from "qrcode";
import { QrCard } from "./QrCard";

/**
 * QrCard kèm ảnh QR tạo sẵn trên server. Máy cũ (dưới iOS 16.4 / Chrome 111) không chạy được
 * JavaScript vẫn thấy mã để quét; máy mới thì QrCard vẽ lại thành ảnh có chú thích.
 */
export async function Qr(props: Omit<React.ComponentProps<typeof QrCard>, "initialSrc">) {
  const initialSrc = props.payload
    ? await QRCode.toDataURL(props.payload, { margin: 2, width: 480, errorCorrectionLevel: "M" })
    : null;
  return <QrCard {...props} initialSrc={initialSrc} />;
}
