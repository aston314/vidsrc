import axios from "axios";
import cryptoJs from "crypto-js";

interface Source {
  sources: Array<{ file: string; label: string }>;
  tracks: Array<{ file: string; label: string; kind: string }>;
  referer: string;
  provider: string;
}

class MoviesAPI {
  private baseUrl: string;
  private secretKey: string;

  constructor(baseUrl: string = "https://moviesapi.club/", secretKey: string = "1FHuaQhhcsKgpTRB") {
    this.baseUrl = baseUrl;
    this.secretKey = secretKey;
  }

  decrypt(jsonStr: string, password: string): any {
    return JSON.parse(
      cryptoJs.AES.decrypt(jsonStr, password, {
        format: {
          parse: (jsonStr: string) => {
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
    const iframe = (
      await axios.get(url, {
        headers: { Referer: this.baseUrl },
      })
    ).data.match(/<iframe.* src="(.*?)"/)[1];
    const jsonStr = (
      await axios.get(iframe, { headers: { Referer: this.baseUrl } })
    ).data.match(/<script type="text\/javascript">.*'(.*?)'.*<\/script>/)[1];
    console.log(iframe);
    var decryptedString = this.decrypt(jsonStr, this.secretKey);
    const sourceReg = /sources\s*:\s*(\[.*?\])/;
    var tracksReg = /tracks\s*:\s*(\[.*?\])/;
    var media: Source = {
      sources: JSON.parse(decryptedString.match(sourceReg)[1]),
      tracks: JSON.parse(decryptedString.match(tracksReg)[1]),
      referer: this.baseUrl,
      provider: "Movieapi.club",
    };
    console.log(media);
    return media;
  }
}

export default MoviesAPI;
