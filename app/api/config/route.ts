import { modelConfigured } from "@/lib/model";
export async function GET() {
  return Response.json({
    modelConfigured: modelConfigured(),
    liveSources:
      "Official company/Fed feeds, SEC XBRL, Nasdaq EPS consensus, US Treasury yields, native equity and Bitget read-only stock perpetual data",
    trading: false,
  });
}
