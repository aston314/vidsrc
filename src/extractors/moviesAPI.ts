import * as cryptoJs from "crypto-js";
import { DecryptMethods, Provider, Source } from "../utils/types";

class MoviesAPI implements Provider {
  private baseUrl: string;
  private secretKey: string;

  constructor(baseUrl: string = "https://moviesapi.club/", secretKey: string = "1FHuaQhhcsKgpTRB") {
    this.baseUrl = baseUrl;
    this.secretKey = secretKey;
  }

  decrypt: DecryptMethods["decrypt"] = (jsonStr, password) => {
    return JSON.parse(
      cryptoJs.AES.decrypt(jsonStr, password, {
        format: {
          parse: (jsonStr) => {
            var j = JSON.parse(jsonStr);
            var cipherParams = cryptoJs.lib.CipherParams.create({
              ciphertext: cryptoJs.enc.Base64.parse(j.ct),
            });
            if (j.iv) cipherParams.iv = cryptoJs.enc.Hex.parse(j.iv);
            if (j.s) cipherParams.salt = cryptoJs.enc.Hex.parse(j.s);
            return cipherParams;
          },
        },
      }).toString(cryptoJs.enc.Utf8)
    );
  }

  async getSource(id: string, isMovie: boolean, s?: string, e?: string): Promise<Source> {
    const url = this.baseUrl + (isMovie ? `movie/${id}` : `tv/${id}-${s}-${e}`);
    console.log(url);

    const response = await fetch(url, {
      headers: { Referer: this.baseUrl },
    });
    const htmlContent = await response.text();
    const iframeMatch = htmlContent.match(/<iframe.* src="(.*?)"/);
    if (!iframeMatch) throw new Error("Iframe source not found");
    const iframe = iframeMatch[1];

    const iframeResponse = await fetch(iframe, {
      headers: { Referer: this.baseUrl },
    });
    const iframeContent = await iframeResponse.text();
    const scriptMatch = iframeContent.match(/<script type="text\/javascript">.*'(.*?)'.*<\/script>/);
    if (!scriptMatch) throw new Error("Script content not found");
    const jsonStr = scriptMatch[1];

    console.log(iframe);
    var decryptedString = this.decrypt(jsonStr, this.secretKey);
    const sourceReg = /sources\s*:\s*(\[.*?\])/;
    var tracksReg = /tracks\s*:\s*(\[.*?\])/;
    var media: Source = {
      sources: JSON.parse(decryptedString.match(sourceReg)?.[1] ?? "[]"),
      tracks: JSON.parse(decryptedString.match(tracksReg)?.[1] ?? "[]"),
      referer: this.baseUrl,
      provider: "Movieapi.club",
      url: iframe
    };
    console.log(media);
    return media;
  }
}

export default MoviesAPI;
