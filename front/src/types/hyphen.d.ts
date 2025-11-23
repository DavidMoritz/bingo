declare module 'hyphen/en' {
  export function hyphenate(text: string): Promise<string>
  export function hyphenateSync(text: string): string
}
