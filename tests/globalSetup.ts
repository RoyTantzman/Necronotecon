// The user lives in Asia/Jerusalem; tests run in that zone unless a test overrides it.
export default function setup() {
  process.env.TZ = 'Asia/Jerusalem'
}
