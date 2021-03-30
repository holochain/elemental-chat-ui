declare module "*.pdf" {
    const file: Buffer;
    export default file;
  }
  
  declare module "*.jpeg" {
    const src: string;
    export default src;
  }
  
  declare module "*.png" {
    const src: string;
    export default src;
  }