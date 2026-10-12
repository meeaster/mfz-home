// Judges import fixture files as text (`with { type: "text" }`); Bun inlines them when OpenEval bundles the judge.
declare module "*.sql" {
  const text: string;

  export default text;
}
