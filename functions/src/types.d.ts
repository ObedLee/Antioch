declare module 'express' {
  interface Request {
    user?: any;
  }
}

declare module 'google-spreadsheet' {
  class GoogleSpreadsheet {
    constructor(spreadsheetId: string, auth: any);
    loadInfo(): Promise<void>;
    sheetsByIndex: any[];
  }
  
  export = GoogleSpreadsheet;
}

declare module 'google-auth-library' {
  export class JWT {
    constructor(options: {
      email: string;
      key: string;
      scopes: string[];
    });
  }
}

declare module 'cors' {
  import { RequestHandler } from 'express';
  
  interface CorsOptions {
    origin?: boolean | string | RegExp | (string | RegExp)[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }
  
  function cors(options?: CorsOptions): RequestHandler;
  
  export = cors;
}
