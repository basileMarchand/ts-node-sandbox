import { Session } from "inspector";
import { RedisClientType, createClient } from "redis";

const REDIS_PREFIX = "cerebro";

type SessionType = {
  userId: number;
  needFullUrl: boolean;
  ipAddress: string;
  portListen: number;
  lessonShortName: string;
  containerId: string;
  token: string;
};

class SessionController {
  #client_: RedisClientType;
  #prefix_: string;

  constructor(client: RedisClientType, keyPrefix: string) {
    this.#client_ = client;
    this.#prefix_ = keyPrefix;
  }

  formatKey(token: string): string {
    if (token.startsWith(this.#prefix_)) {
      return token;
    }
    return this.#prefix_ + token;
  }

  async isSessionRegistered(token: string): Promise<boolean> {
    return this.#client_
      .exists(this.formatKey(token))
      .then((value: number): boolean => {
        return value != 0;
      });
  }

  async registerSession(token: string, session: SessionType): Promise<boolean> {
    return this.isSessionRegistered(token)
      .then((isRegistered: boolean) => {
        if (isRegistered) {
          throw new Error(`Session with token ${token} alredy registered`);
        }
        return this.#client_.json
          .set(this.formatKey(token), ".", session)
          .then((status: string) => {
            return status == "OK";
          });
      })
      .catch((err) => {
        throw err;
      });
  }

  async getSessionInfo(token: string): Promise<SessionType> {
    return this.isSessionRegistered(token)
      .then((isRegistered: boolean) => {
        if (!isRegistered) {
          throw new Error(`Session with token ${token} doesn't exists`);
        }
        return this.#client_.json
          .get(this.formatKey(token))
          .then((value): SessionType => {
            return value as SessionType;
          });
      })
      .catch((err) => {
        throw err;
      });
  }

  async delSessionInfo(token: string): Promise<boolean> {
    return this.isSessionRegistered(token)
      .then((isRegistered: boolean) => {
        if (!isRegistered) {
          return new Promise<number>((resolve) => {
            resolve(0);
          }); // silently ignore delete not existing session
        }
        return this.#client_.json.del(this.formatKey(token));
      })
      .then((ret) => {
        return ret != 0;
      })
      .catch((err) => {
        throw err;
      });
  }

  async deleteSessions(
    filter: (s: SessionType) => boolean
  ): Promise<boolean[]> {
    return this.#client_
      .keys(this.#prefix_ + "*")
      .then((keys: Array<string>) => {
        return Promise.all(
          keys.map(async (key: string): Promise<boolean> => {
            return this.#client_.json.get(key).then((item: SessionType) => {
              if (filter(item)) {
                return this.delSessionInfo(key);
              } else {
                return new Promise((resolve) => {
                  resolve(false);
                });
              }
            });
          })
        );
      });
  }

  async listRegisteredSession(
    filter: (s: SessionType) => boolean
  ): Promise<Array<SessionType>> {
    return this.#client_.keys("*").then((keys: Array<string>) => {
      return Promise.all(
        keys.map(async (key: string): Promise<SessionType> => {
          return this.#client_.json.get(key).then((value) => {
            return value as SessionType;
          });
        })
      ).then((values: Array<SessionType>) => {
        return values.filter(filter);
      });
    });
  }

  async close(): Promise<void> {
    return this.#client_.disconnect();
  }
}

const createController = (
  client: RedisClientType,
  prefix: string = REDIS_PREFIX
): SessionController => {
  return new SessionController(client, prefix);
};

export { SessionType, createController, SessionController };
