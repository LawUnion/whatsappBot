import { FullScreenLoader } from "@/components/ui/FullScreenLoader";

export default function Loading() {
  return <FullScreenLoader isVisible={true} message="Loading page..." />;
}
