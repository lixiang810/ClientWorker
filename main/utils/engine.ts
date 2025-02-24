import cons from "./cons";
import rebuild from "./rebuild";

if (!Promise.any) {
  Promise.any = function (promises: Promise<unknown>[]) {
    return new Promise((resolve, reject) => {
      promises = Array.isArray(promises) ? promises : [];
      let len = promises.length;
      let errs: unknown[] = [];
      if (len === 0)
        return reject(new AggregateError("All promises were rejected"));
      promises.forEach((promise) => {
        promise.then(
          (value) => {
            resolve(value);
          },
          (err) => {
            len--;
            errs.push(err);
            if (len === 0) {
              reject(new AggregateError(errs));
            }
          }
        );
      });
    });
  };
}

export type FetchEngineConfig = Partial<{
  mode: RequestMode;
  credentials: RequestCredentials;
  timeout: number;
  redirect: RequestRedirect;
  threads: number;
  trylimit: number;
  status: number;
  signal: AbortSignal;
}>;

type FetchEngineFunction = (
  req: Request,
  config: FetchEngineConfig
) => Promise<Response>;

const FetchEngine: Record<"fetch" | "crazy", FetchEngineFunction> &
  Record<
    "KFCThursdayVW50" | "parallel" | "classic",
    (reqs: Request[] | Request, config: FetchEngineConfig) => Promise<Response>
  > = {
  fetch: async (req, config) => {
    config = config || { status: 200 };
    return new Promise((resolve, reject) => {
      const reqtype = Object.prototype.toString.call(req);
      if (reqtype !== "[object String]" && reqtype !== "[object Request]") {
        reject(
          `FetchEngine.fetch: req must be a string or Request object,but got ${reqtype}`
        );
      }
      setTimeout(() => {
        reject(
          new Response(
            "504 All GateWays Failed,ClientWorker Show This Page,Engine Fetch",
            { status: 504, statusText: "504 All Gateways Timeout" }
          )
        );
      }, config.timeout || 5000);
      fetch(req, {
        mode: config.mode,
        credentials: config.credentials,
        redirect: config.redirect || "follow",
      })
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  crazy: async (req, config) => {
    config = config || { status: 200 };
    config.threads = config.threads || 4;
    config.trylimit = config.trylimit || 10;
    const reqtype = Object.prototype.toString.call(req);
    if (reqtype !== "[object String]" && reqtype !== "[object Request]") {
      cons.e(
        `FetchEngine.fetch: req must be a string or Request object,but got ${reqtype}`
      );
      throw new Error(
        `FetchEngine.fetch: req must be a string or Request object,but got ${reqtype}`
      );
    }
    const controller = new AbortController();
    const PreFetch = await fetch(req, {
      signal: controller.signal,
      mode: config.mode,
      credentials: config.credentials,
      redirect: config.redirect || "follow",
    });
    const PreHeaders = PreFetch.headers;
    const AllSize = PreHeaders.get("Content-Length");
    if (
      config.status &&
      PreFetch.status.toString().match(config.status.toString())
    ) {
      return new Response(
        "504 All GateWays Failed,ClientWorker Show This Page,Engine Crazy",
        { status: 504, statusText: "504 All Gateways Timeout" }
      );
    }
    controller.abort();
    if (!AllSize || Number(AllSize) < config.threads) {
      cons.e(
        `FetchEngine.crazy: The Origin is not support Crazy Mode,or the size of the file is less than ${config.threads} bytes,downgrade to normal fetch`
      );
      return FetchEngine.fetch(req, config);
    }
    return new Promise((resolve, reject) => {
      const chunkSize = Math.floor(Number(AllSize) / config.threads!);
      const chunks: Promise<ArrayBuffer | undefined>[] = [];
      for (let i = 0; i < config.threads!; i++) {
        chunks.push(
          new Promise(async (res, rej) => {
            let trycount = 1;
            const instance = async (): Promise<ArrayBuffer> => {
              trycount += 1;
              const nReq = rebuild.request(req, {
                headers: {
                  Range: `bytes=${i * chunkSize}-${(i + 1) * chunkSize - 1}`,
                },
                url: req.url,
              });
              return fetch(nReq, {
                mode: config.mode,
                credentials: config.credentials,
                redirect: config.redirect || "follow",
              })
                .then((res) => res.arrayBuffer())
                .catch((err) => {
                  if (trycount >= config.trylimit!) {
                    reject();
                  }
                  return instance();
                });
            };
            res(instance());
          })
        );
      }
      Promise.all(chunks).then((responses) => {
        const resbodys: BlobPart[] = [];
        for (let i = 0; i < responses.length; i++) {
          resbodys.push(responses[i]!);
        }
        resolve(
          new Response(new Blob(resbodys), {
            headers: PreHeaders,
            status: 200,
            statusText: "OK",
          })
        );
      });
      setTimeout(() => {
        reject(
          new Response(
            "504 All GateWays Failed,ClientWorker Show This Page,Engine Crazy",
            { status: 504, statusText: "504 All Gateways Timeout" }
          )
        );
      }, config.timeout || 5000);
    });
  },

  KFCThursdayVW50: async (reqs, config) => {
    config = config || { status: 200 };
    config.threads = config.threads || 4;
    config.trylimit = config.trylimit || 10;
    const reqtype = Object.prototype.toString.call(reqs);
    if (reqtype === "[object String]" || reqtype === "[object Request]") {
      cons.w(
        `FetchEngine.KFCThursdayVW50: reqs is a string or Request object,downgrade to crazy`
      );
      return FetchEngine.crazy(reqs as Request, config);
    } else if (reqtype !== "[object Array]") {
      cons.e(
        `FetchEngine.KFCThursdayVW50: reqs must be a string or Request object or an array,but got ${reqtype}`
      );
      return Promise.reject(
        `FetchEngine.KFCThursdayVW50: reqs must be a string or Request object or an array,but got ${reqtype}`
      );
    } else if (reqtype === "[object Array]") {
      if ((reqs as Request[]).length === 0) {
        cons.e(`FetchEngine.KFCThursdayVW50: reqs array is empty`);
        throw new Error("FetchEngine.KFCThursdayVW50: reqs array is empty");
      }
      if ((reqs as Request[]).length === 1) {
        cons.w(
          `FetchEngine.KFCThursdayVW50: reqs array is only one,downgrade to crazy`
        );
        return FetchEngine.crazy((reqs as Request[])[0], config);
      }
    }
    const controller = new AbortController();
    const PreFetch = await FetchEngine.parallel(reqs, {
      signal: controller.signal,
      mode: config.mode,
      credentials: config.credentials,
      redirect: config.redirect || "follow",
      timeout: config.timeout || 30000,
    });

    const PreHeaders = PreFetch.headers;
    const AllSize = PreHeaders.get("Content-Length");
    if (
      config.status &&
      PreFetch.status.toString().match(config.status.toString())
    ) {
      return Promise.reject(
        new Response(
          "504 All GateWays Failed,ClientWorker Show This Page,Engine KFCThursdayVW50",
          { status: 504, statusText: "504 All Gateways Timeout" }
        )
      );
    }
    controller.abort();
    if (!AllSize || Number(AllSize) < config.threads) {
      cons.e(
        `FetchEngine.KFCThursdayVW50: The Origin is not support KFCThursdayVW50 Mode,or the size of the file is less than ${config.threads} bytes,downgrade to normal fetch`
      );
      return FetchEngine.fetch(reqs as Request, config);
    }
    return new Promise((resolve, reject) => {
      const chunkSize = Math.floor(Number(AllSize) / config.threads!);
      const chunks: Promise<ArrayBuffer>[] = [];
      for (let i = 0; i < config.threads!; i++) {
        chunks.push(
          new Promise(async (res, rej) => {
            let trycount = 1;
            const instance = async (): Promise<ArrayBuffer> => {
              trycount += 1;
              const nReqs: Request[] = [];
              (reqs as Request[]).forEach((req) => {
                nReqs.push(
                  rebuild.request(req, {
                    headers: {
                      Range: `bytes=${i * chunkSize}-${
                        (i + 1) * chunkSize - 1
                      }`,
                    },
                    url: req.url,
                  })
                );
              });
              return FetchEngine.parallel(nReqs, {
                mode: config.mode,
                credentials: config.credentials,
                redirect: config.redirect || "follow",
                timeout: config.timeout || 30000,
                status: 206,
              })
                .then((res) => res.arrayBuffer())
                .catch(async (err) => {
                  cons.e(`FetchEngine.KFCThursdayVW50: ${await err.text()}`);
                  if (trycount >= config.trylimit!) {
                    reject();
                  }
                  return instance();
                });
            };
            res(instance());
          })
        );
      }
      Promise.all(chunks).then((responses) => {
        const resbodys: BlobPart[] = [];
        for (let i = 0; i < responses.length; i++) {
          resbodys.push(responses[i]);
        }
        resolve(
          new Response(new Blob(resbodys), {
            headers: PreHeaders,
            status: 200,
            statusText: "OK",
          })
        );
      });
      setTimeout(() => {
        reject(
          new Response(
            "504 All GateWays Failed,ClientWorker Show This Page,Engine KFCThursdayVW50",
            { status: 504, statusText: "504 All Gateways Timeout" }
          )
        );
      }, config.timeout || 30000);
    });
  },
  classic: async (reqs, config) => {
    return new Promise((resolve, reject) => {
      config = config || { status: 200 };
      const reqtype = Object.prototype.toString.call(reqs);
      if (reqtype === "[object String]" || reqtype === "[object Request]") {
        cons.w(
          `FetchEngine.classic: reqs should be an array,but got ${reqtype},this request will downgrade to normal fetch`
        );
        resolve(FetchEngine.fetch(reqs as Request, config));
      } else if (reqtype !== "[object Array]") {
        cons.e(
          `FetchEngine.classic: reqs must be a string , Request or Array object,but got ${reqtype}`
        );
        reject();
      } else if (reqtype === "[object Array]") {
        if (reqtype.length === 0) {
          cons.e(`FetchEngine.classic: reqs array is empty`);
          reject();
        }
        if (reqtype.length === 1) {
          cons.w(
            `FetchEngine.classic: reqs array is only one element,this request will downgrade to normal fetch`
          );
          resolve(FetchEngine.fetch((reqs as Request[])[0], config));
        }
      }
      const controller = new AbortController();
      const PauseProgress = async (res: Response) => {
        return new Response(await res.arrayBuffer(), {
          status: res.status,
          headers: res.headers,
          statusText: res.statusText,
        });
      };

      Promise.any(
        (reqs as Request[]).map((req) => {
          fetch(req, {
            signal: controller.signal,
            mode: config.mode,
            credentials: config.credentials,
            redirect: config.redirect || "follow",
          })
            .then(PauseProgress)
            .then((res) => {
              if (
                config.status &&
                res.status.toString().match(config.status.toString())
              ) {
                controller.abort();
                resolve(res);
              }
            })
            .catch((err) => {
              if (err == "DOMException: The user aborted a request.")
                console.log(); //To disable the warning:DOMException: The user aborted a request.
            });
        })
      );

      setTimeout(() => {
        reject(
          new Response(
            "504 All GateWays Failed,ClientWorker Show This Page,Engine Classic",
            { status: 504, statusText: "504 All Gateways Timeout" }
          )
        );
      }, config.timeout || 5000);
    });
  },
  parallel: async (reqs, config) => {
    return new Promise((resolve, reject) => {
      config = config || { status: 200 };
      const reqtype = Object.prototype.toString.call(reqs);
      if (reqtype === "[object String]" || reqtype === "[object Request]") {
        cons.w(
          `FetchEngine.parallel: reqs should be an array,but got ${reqtype},this request will downgrade to normal fetch`
        );
        resolve(FetchEngine.fetch(reqs as Request, config));
      } else if (reqtype !== "[object Array]") {
        cons.e(
          `FetchEngine.parallel: reqs must be a string , Request or Array object,but got ${reqtype}`
        );
        reject();
      } else if (reqtype === "[object Array]") {
        if (reqtype.length === 0) {
          cons.e(`FetchEngine.parallel: reqs array is empty`);
          reject();
        }
        if (reqtype.length === 1) {
          cons.w(
            `FetchEngine.parallel: reqs array is only one element,this request will downgrade to normal fetch`
          );
          resolve(FetchEngine.fetch((reqs as Request[])[0], config));
        }
      }
      const abortEvent = new Event("abortOtherInstance");
      const eventTarget = new EventTarget();
      Promise.any(
        (reqs as Request[]).map(async (req) => {
          let controller = new AbortController(),
            tagged = false;
          eventTarget.addEventListener(abortEvent.type, () => {
            if (!tagged) controller.abort();
          });
          fetch(req, {
            signal: controller.signal,
            mode: config.mode,
            credentials: config.credentials,
            redirect: config.redirect || "follow",
          })
            .then((res) => {
              if (
                config.status &&
                res.status.toString().match(config.status.toString())
              ) {
                tagged = true;
                eventTarget.dispatchEvent(abortEvent);
                resolve(rebuild.response(res, {}));
              }
            })
            .catch((err) => {
              if (err == "DOMException: The user aborted a request.")
                console.log(); //To disable the warning:DOMException: The user aborted a request.
            });
        })
      );

      setTimeout(() => {
        reject(
          new Response(
            "504 All GateWays Failed,ClientWorker Show This Page,Engine Parallel",
            { status: 504, statusText: "504 All Gateways Timeout" }
          )
        );
      }, config.timeout || 5000);
    });
  },
};

export default FetchEngine;
