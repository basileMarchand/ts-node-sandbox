import * as dotenv from "dotenv";
dotenv.config();
import { RedisClientType, createClient } from "redis";
import {
  SessionType,
  createController,
  SessionController,
} from "./src/session_controller";

const REDIS_HOST: string = process.env["REDIS_HOST"]
  ? process.env["REDIS_HOST"]
  : "localhost";

const REDIS_PREFIX = "TEST_";

// 172.17.0.2

let client: RedisClientType = createClient({
  url: `redis://${REDIS_HOST}:6379`,
});

let sessionController: SessionController;

beforeAll(async () => {
  // Before starting test initialize redis connection
  return client
    .connect()
    .then(() => {
      sessionController = createController(client, REDIS_PREFIX);
    })
    .then(() => {
      return sessionController.deleteSessions((item: SessionType) => {
        return item.ipAddress === "127.0.0.1";
      });
    });
});

afterAll(async () => {
  return sessionController.close();
});

test("create_controller", () => {
  expect(sessionController).toBeInstanceOf(SessionController);
});

test("delete_not_existing_data", async () => {
  const missingKeyName: string = "missing";
  const out: boolean = await sessionController.delSessionInfo(missingKeyName);

  expect(out).toBeFalsy();
});

test("save_data_in_redis", async () => {
  const keyName = "key";
  const out: boolean = await sessionController.delSessionInfo(keyName);
  const data: SessionType = {
    userId: 1,
    needFullUrl: false,
    ipAddress: "127.0.0.1",
    portListen: 8000,
    lessonShortName: "fake-lesson",
    containerId: "0123456789",
    token: keyName,
  };
  await sessionController.registerSession(keyName, data);

  return Promise.all(
    ["userId", "needFullUrl", "ipAddress"].map((key: string) => {
      return client.json
        .get(REDIS_PREFIX + keyName, { path: `.${key}` })
        .then((value) => {
          expect(value).toBe(data[key]);
        });
    })
  );
});

test("error_on_save_duplicate", async () => {
  const keyName = "key";
  const out: boolean = await sessionController.delSessionInfo(keyName);
  const data: SessionType = {
    userId: 1,
    needFullUrl: false,
    ipAddress: "127.0.0.1",
    portListen: 8000,
    lessonShortName: "fake-lesson",
    containerId: "0123456789",
    token: keyName,
  };
  await sessionController.registerSession(keyName, data); // Save first no probleme

  await expect(async () => {
    return sessionController.registerSession(keyName, data);
  }).rejects.toThrow();
});

test("get_data", async () => {
  const keyName = "key";
  const out: boolean = await sessionController.delSessionInfo(keyName);
  const data: SessionType = {
    userId: 1,
    needFullUrl: false,
    ipAddress: "127.0.0.1",
    portListen: 8000,
    lessonShortName: "fake-lesson",
    containerId: "0123456789",
    token: keyName,
  };
  await sessionController.registerSession(keyName, data); // Save first no probleme

  const fromRedis: SessionType = await sessionController.getSessionInfo(
    keyName
  );
  expect(fromRedis).toEqual(data);
});

test("get_data_error", async () => {
  await expect(async () => {
    const fromRedis: SessionType = await sessionController.getSessionInfo(
      "doesn_exists"
    );
  }).rejects.toThrow();
});

test("list_session", async () => {
  const data: SessionType = {
    userId: 1,
    needFullUrl: false,
    ipAddress: "127.0.0.1",
    portListen: 8000,
    lessonShortName: "list-fake-lesson",
    containerId: "0123456789",
    token: "item0",
  };
  await sessionController.registerSession("item0", data);
  data.lessonShortName = "list-another-fake-lesson";
  data.token = "item1";
  await sessionController.registerSession("item1", data); // Save first no probleme
  data.lessonShortName = "list-fake-lesson";
  data.token = "item2";
  await sessionController.registerSession("item2", data); // Save first no probleme

  const sessions: SessionType[] = await sessionController.listRegisteredSession(
    (session: SessionType) => {
      return session.lessonShortName === "list-fake-lesson";
    }
  );

  expect(sessions.length).toBe(2);

  const sessions_another: SessionType[] =
    await sessionController.listRegisteredSession((session: SessionType) => {
      return session.lessonShortName === "list-another-fake-lesson";
    });
  expect(sessions_another.length).toBe(1);
});

test("list_empty_session", async () => {
  const sessions_another: SessionType[] =
    await sessionController.listRegisteredSession((session: SessionType) => {
      return session.lessonShortName === "empty-fake";
    });
  expect(sessions_another.length).toBe(0);
});
