// tsup's DTS step clears every .d.ts in dist after onSuccess runs, which wipes
// the rockin/sdk/* type entries. The build script reruns this once tsup is done.
import { writeSdkEntries } from "./sdk-entries"

writeSdkEntries()
