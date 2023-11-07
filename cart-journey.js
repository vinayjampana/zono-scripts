import http from "k6/http";
import { sleep } from "k6";
import { Counter } from "k6/metrics";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

const apiHost = "https://api-uat.beta.pharmconnect.com";
let customersData = [];

export let options = {
  vus: 10,
  iterations: 100,
  duration: "10m",
};

export function handleSummary(data) {
  return {
    "summary.html": htmlReport(data, { indent: " ", enableColors: true }),
  };
}

export const failedRequests = new Counter("failed_requests");
export const successfulRequests = new Counter("successful_requests");

const getHeaders = (token) => {
  return {
    authority: "api-uat.beta.pharmconnect.com",
    accept: "*/*",
    "accept-language": "en-GB,en;q=0.8",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    origin: "https://app-uat.beta.pharmconnect.com",
    referer: "https://app-uat.beta.pharmconnect.com/",
    "sec-ch-ua": '"Brave";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "Linux",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "sec-gpc": "1",
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  };
};
const regenerateToken = (token, refreshToken) => {
  let data = {
    refreshToken: refreshToken,
    token: token,
  };

  let response = http.post(
    "https://api-uat.beta.pharmconnect.com/regenerate/token",
    JSON.stringify(data),
    {
      headers: getHeaders(token),
    }
  );

  const regenerateAPIData = JSON.parse(response.body);
  return regenerateAPIData.token;
};

function makeRequestWithAutoRetry(
  url,
  body,
  token,
  refreshToken,
  method = "post",
  retry = false
) {
  let res;
  let headers = getHeaders(token);

  if (method.toLowerCase() === "get") {
    res = http.get(`${apiHost}/${url}`, { headers });
  } else {
    res = http.post(`${apiHost}/${url}`, JSON.stringify(body), {
      headers: headers,
    });
  }

  const success = res.status >= 200 && res.status < 400;
  if (!success) {
    failedRequests.add(1);
  } else {
    successfulRequests.add(1);
  }

  console.log(`Request duration for API ${url}: ${res.timings.duration}ms`);

  if (res.status === 401 && !retry) {
    console.log(`Received 401 from ${url}, regenerating token and retrying.`);

    const newToken = regenerateToken(
      headers["authorization"].replace("Bearer ", ""),
      refreshToken
    );

    headers.Authorization = `Bearer ${newToken}`;

    findByTokenAndUpdate(token, newToken);

    return makeRequestWithAutoRetry(
      url,
      body,
      newToken,
      refreshToken,
      method,
      (retry = true)
    );
  } else {
    console.log(`Received ${res.status} from ${url}.`);
  }

  return res;
}

function findByTokenAndUpdate(token, newValue, field) {
  field = typeof field !== "undefined" ? field : "token";

  return customersData.map(function (customer) {
    if (customer.token === token) {
      var updatedCustomer = Object.create(Object.getPrototypeOf(customer));
      for (var prop in customer) {
        if (customer.hasOwnProperty(prop)) {
          updatedCustomer[prop] = customer[prop];
        }
      }
      updatedCustomer[field] = newValue;
      updatedCustomer["zonompLava"] = newValue;

      return updatedCustomer;
    }

    return customer;
  });
}

const performLoadTest = (
  token,
  refreshToken,
  sellerWorkspaceId,
  customerId,
  orderPayLoad
) => {
  const addItemToActiveOrderResponse = makeRequestWithAutoRetry(
    `commerce-v2/orders/additemtoactiveorder/${sellerWorkspaceId}`,
    orderPayLoad,
    findTokenByCustomerId(customerId),
    refreshToken
  );

  sleep(10);

  console.error(
    addItemToActiveOrderResponse.status,
    addItemToActiveOrderResponse.body
  );

  if (
    addItemToActiveOrderResponse.status >= 200 &&
    addItemToActiveOrderResponse.status < 400
  ) {
    let poFileResponse = makeRequestWithAutoRetry(
      `commerce-v2/poFiles/${sellerWorkspaceId}?customerId=${customerId}&includeActiveOrders=true&includeSummary=true`,
      {},
      findTokenByCustomerId(customerId),
      refreshToken,
      "get"
    );
    if (poFileResponse.status >= 200 && poFileResponse.status < 400) {
      const manualFileId = JSON.parse(poFileResponse.body).files.find(
        (item) => item.importSource === "manual"
      ).id;

      sleep(10);

      const checkoutResponse = makeRequestWithAutoRetry(
        `commerce-v2/orders/checkout/${sellerWorkspaceId}`,
        {
          sellerWorkspaceId: sellerWorkspaceId,
          customerId: customerId,
          poFileIds: [manualFileId],
        },
        findTokenByCustomerId(customerId),
        refreshToken
      );
    }
  }
};

const findTokenByCustomerId = (customerId) => {
  return customersData.find((x) => x.customerId === customerId).token;
};

export default function () {
  customersData = [
    {
      customerId: "646a6eca-2282-4a72-846a-9b305b71c2a3",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiMDkzZWZmNmEtMTM0Yy00ZDFmLWIyNjQtMTVlYTllOTU0YTBmIiwid29ya3NwYWNlSWQiOiJlY2RjYTMxOS1mMDZjLTQzZWYtYjYxMi05YTkwYjU0Njg0MWYiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMzOTMzMCwiZXhwIjoxNjk5MzQwNTMwfQ.Zza26VTeny4lCHmBx4aV24QpGBA3bQgNjVkULS7BydE",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiMDkzZWZmNmEtMTM0Yy00ZDFmLWIyNjQtMTVlYTllOTU0YTBmIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTY0MDU0OTIsImV4cCI6MTcyNzk0MTQ5Mn0.Xx6Nlb87b9Z4tgk8LWkzaTCaeES74twg8-OdsvQWjYo",
      number: "9606019225",
      orderPayLoad: {
        customerId: "646a6eca-2282-4a72-846a-9b305b71c2a3",
        sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
        lines: [
          { productVariantId: 31778, quantity: 1 },
          { productVariantId: 31781, quantity: 10 },
          { productVariantId: 31783, quantity: 10 },
          { productVariantId: 31796, quantity: 1 },
          { productVariantId: 31828, quantity: 25 },
          { productVariantId: 31838, quantity: 25 },
          { productVariantId: 31840, quantity: 10 },
          { productVariantId: 31843, quantity: 10 },
          { productVariantId: 31845, quantity: 5 },
          { productVariantId: 31851, quantity: 5 },
          { productVariantId: 31870, quantity: 10 },
          { productVariantId: 31871, quantity: 10 },
          { productVariantId: 31875, quantity: 10 },
          { productVariantId: 31885, quantity: 10 },
          { productVariantId: 31886, quantity: 10 },
        ],
      },
    },
    {
      customerId: "ab2eb2bb-9798-4cc7-8440-a16fdf3a7b47",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "4242433333",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiY2U0MmFkZDQtMzAxOC00ZjIwLWE2NmUtYzUxMjVjZTQyMmYyIiwid29ya3NwYWNlSWQiOiJiMzdhYzRjMy0yMzAzLTRjY2MtODRhNS1kMzNiNzAxZjQ2ZDkiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMzNzk5NSwiZXhwIjoxNjk5MzM5MTk1fQ.TbETlnaizlRNkg6KRwInCiVqTRSZZPwUSwqr12N21Yk",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiY2U0MmFkZDQtMzAxOC00ZjIwLWE2NmUtYzUxMjVjZTQyMmYyIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTEwMjcsImV4cCI6MTcyODY0NzAyN30.Zv8ITlZ7XgT3E-XCzncOP1wUFG0U1mBTIYthDw62MtM",
      orderPayLoad: {
        customerId: "ab2eb2bb-9798-4cc7-8440-a16fdf3a7b47",
        sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
        source: "manual",
        lines: [
          { productVariantId: 35582, quantity: 10, operator: "add" },
          { productVariantId: 34996, quantity: 10, operator: "add" },
          { productVariantId: 34995, quantity: 10, operator: "add" },
          { productVariantId: 34507, quantity: 10, operator: "add" },
          { productVariantId: 34497, quantity: 10, operator: "add" },
          { productVariantId: 34498, quantity: 10, operator: "add" },
          { productVariantId: 34486, quantity: 10, operator: "add" },
          { productVariantId: 34500, quantity: 10, operator: "add" },
          { productVariantId: 34478, quantity: 10, operator: "add" },
          { productVariantId: 33720, quantity: 10, operator: "add" },
          { productVariantId: 33718, quantity: 10, operator: "add" },
          { productVariantId: 33712, quantity: 10, operator: "add" },
          { productVariantId: 33711, quantity: 10, operator: "add" },
          { productVariantId: 33709, quantity: 10, operator: "add" },
          { productVariantId: 33707, quantity: 10, operator: "add" },
          { productVariantId: 33704, quantity: 10, operator: "add" },
          { productVariantId: 33700, quantity: 10, operator: "add" },
          { productVariantId: 33692, quantity: 10, operator: "add" },
          { productVariantId: 33688, quantity: 10, operator: "add" },
          { productVariantId: 33687, quantity: 10, operator: "add" },
          { productVariantId: 33685, quantity: 10, operator: "add" },
          { productVariantId: 33683, quantity: 10, operator: "add" },
          { productVariantId: 33681, quantity: 10, operator: "add" },
          { productVariantId: 33680, quantity: 10, operator: "add" },
          { productVariantId: 33679, quantity: 10, operator: "add" },
          { productVariantId: 33678, quantity: 10, operator: "add" },
          { productVariantId: 33677, quantity: 10, operator: "add" },
          { productVariantId: 33676, quantity: 10, operator: "add" },
          { productVariantId: 33675, quantity: 10, operator: "add" },
          { productVariantId: 33674, quantity: 10, operator: "add" },
          { productVariantId: 33671, quantity: 10, operator: "add" },
          { productVariantId: 33670, quantity: 10, operator: "add" },
          { productVariantId: 33669, quantity: 10, operator: "add" },
          { productVariantId: 33665, quantity: 10, operator: "add" },
          { productVariantId: 33664, quantity: 10, operator: "add" },
          { productVariantId: 33659, quantity: 10, operator: "add" },
          { productVariantId: 33655, quantity: 10, operator: "add" },
          { productVariantId: 33654, quantity: 10, operator: "add" },
          { productVariantId: 33651, quantity: 10, operator: "add" },
          { productVariantId: 33650, quantity: 10, operator: "add" },
        ],
      },
    },
    {
      customerId: "0938ed8d-09e0-42f3-af27-126d743b4e2b",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "9898989833",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYTdjODU3MTYtNjYyNi00NDllLWJiNTItMzBhNjFjZTQ3NmFkIiwid29ya3NwYWNlSWQiOiJiYjdkYTcyMi0zN2NiLTRlNmUtYTA3Yy0wZWZiYjRjNzVjYTgiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMzOTI1MCwiZXhwIjoxNjk5MzQwNDUwfQ.Y_6d_CdbzEPTEbI0zBlwI_Cm1IMOc1gVSg2JXZM7fbU",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYTdjODU3MTYtNjYyNi00NDllLWJiNTItMzBhNjFjZTQ3NmFkIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcwMzg2MjQsImV4cCI6MTcyODU3NDYyNH0.CF09NLKqk4NLtBUF4i7aRY_JMAGMxNigUVyOfU6V8eo",
      orderPayLoad: {
        customerId: "0938ed8d-09e0-42f3-af27-126d743b4e2b",
        sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
        lines: [
          { productVariantId: 31618, quantity: 5 },
          { productVariantId: 31619, quantity: 1 },
          { productVariantId: 31620, quantity: 1 },
          { productVariantId: 31621, quantity: 10 },
          { productVariantId: 31622, quantity: 5 },
          { productVariantId: 31623, quantity: 1 },
          { productVariantId: 31624, quantity: 1 },
          { productVariantId: 31625, quantity: 10 },
          { productVariantId: 31626, quantity: 10 },
          { productVariantId: 31627, quantity: 30 },
          { productVariantId: 31628, quantity: 1 },
          { productVariantId: 31629, quantity: 1 },
          { productVariantId: 31630, quantity: 1 },
          { productVariantId: 31631, quantity: 1 },
          { productVariantId: 31632, quantity: 1 },
          { productVariantId: 31633, quantity: 10 },
          { productVariantId: 31634, quantity: 1 },
          { productVariantId: 31636, quantity: 5 },
          { productVariantId: 31637, quantity: 10 },
        ],
      },
    },
    {
      customerId: "991a4e99-bd76-4d24-9f04-8a0c2e74a26c",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "9898989811",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYzcxODljZTctNDIwYS00NWJhLTkwMTgtNmZmZjU2OTU5NWJkIiwid29ya3NwYWNlSWQiOiJkYTQyMzdmMC1hZmQ2LTQ0NDktOTU5MS03MDg0MGQyMTE2MWYiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMzODY0MSwiZXhwIjoxNjk5MzM5ODQxfQ.aREOEnbocD5t0W_Q7NobyeeKMHochGB6yyiKFjJqNfQ",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYzcxODljZTctNDIwYS00NWJhLTkwMTgtNmZmZjU2OTU5NWJkIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcwMzg1NTAsImV4cCI6MTcyODU3NDU1MH0.0R_uJOqtfKMluLatYS0Tni3zNah_ZVvaPv6SwtZCQMg",
      orderPayLoad: {
        customerId: "991a4e99-bd76-4d24-9f04-8a0c2e74a26c",
        sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
        lines: [
          { productVariantId: 31604, quantity: 10 },
          { productVariantId: 31618, quantity: 5 },
          { productVariantId: 31619, quantity: 1 },
          { productVariantId: 31620, quantity: 1 },
          { productVariantId: 31621, quantity: 10 },
          { productVariantId: 31622, quantity: 5 },
          { productVariantId: 31623, quantity: 1 },
          { productVariantId: 31624, quantity: 1 },
          { productVariantId: 31625, quantity: 10 },
          { productVariantId: 31626, quantity: 10 },
          { productVariantId: 31627, quantity: 30 },
          { productVariantId: 31628, quantity: 1 },
          { productVariantId: 31629, quantity: 1 },
          { productVariantId: 31630, quantity: 1 },
          { productVariantId: 31631, quantity: 1 },
          { productVariantId: 31632, quantity: 1 },
          { productVariantId: 31633, quantity: 10 },
          { productVariantId: 31634, quantity: 1 },
          { productVariantId: 31636, quantity: 5 },
          { productVariantId: 31637, quantity: 10 },
        ],
      },
    },

    {
      customerId: "b35c50f7-9509-4fb0-88fd-d2e08055eb2e",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "9898989822",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiZTA0ZjI0MjYtNjE5Zi00NzJmLWE0YWItODBkNzJiZWMyN2NmIiwid29ya3NwYWNlSWQiOiI0MzQ5MzRkYi04YmE1LTQ3MDItOTIxZS1iNWM4YjVmZTUyYzMiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMzOTA4OSwiZXhwIjoxNjk5MzQwMjg5fQ.lPAAQ_FgbNd6x3lKebrse0iHd9usWqe6jEmjnZ6mS_M",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiZTA0ZjI0MjYtNjE5Zi00NzJmLWE0YWItODBkNzJiZWMyN2NmIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcwMzg2MzcsImV4cCI6MTcyODU3NDYzN30.f6nuqv1ycdIkYF8W_ChK7pUQz90DUUzC4jGHI-oWcnY",
      orderPayLoad: {
        customerId: "b35c50f7-9509-4fb0-88fd-d2e08055eb2e",
        sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
        lines: [
          { productVariantId: 31619, quantity: 1 },
          { productVariantId: 31776, quantity: 10 },
          { productVariantId: 31777, quantity: 4 },
          { productVariantId: 31778, quantity: 1 },
          { productVariantId: 31779, quantity: 2 },
          { productVariantId: 31780, quantity: 10 },
          { productVariantId: 31781, quantity: 10 },
          { productVariantId: 31782, quantity: 10 },
          { productVariantId: 31783, quantity: 10 },
          { productVariantId: 31784, quantity: 2 },
          { productVariantId: 31785, quantity: 2 },
          { productVariantId: 31786, quantity: 2 },
          { productVariantId: 31787, quantity: 2 },
          { productVariantId: 31788, quantity: 2 },
          { productVariantId: 31789, quantity: 2 },
          { productVariantId: 31790, quantity: 2 },
          { productVariantId: 31791, quantity: 1 },
          { productVariantId: 31792, quantity: 1 },
          { productVariantId: 31793, quantity: 1 },
          { productVariantId: 31794, quantity: 10 },
        ],
      },
    },
    {
      customerId: "220d149b-7bba-4a29-a856-5eb0f42c01b2",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "3331113331",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiODdlYTVlZDYtNmQ1ZS00NzMwLWFmNjYtZTcwYmNkM2E0NGQ1Iiwid29ya3NwYWNlSWQiOiI1NzI0NzAxOC1kZDJjLTQ4NWQtOTA0Ny1jNjY0ZGUyZmRmYTMiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMzODAwMSwiZXhwIjoxNjk5MzM5MjAxfQ.RLFurnHmASbnIDlEZWu6wwqLOvF2IvNaCn0F9ghFpeU",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiODdlYTVlZDYtNmQ1ZS00NzMwLWFmNjYtZTcwYmNkM2E0NGQ1Iiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTEzMDEsImV4cCI6MTcyODY0NzMwMX0.ne4eW9TIchHBgXQfKFLGoKNMocF74Yvm9OoVUitqIHA",
      orderPayLoad: {
        customerId: "220d149b-7bba-4a29-a856-5eb0f42c01b2",
        sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
        lines: [
          { productVariantId: 31604, quantity: 10 },
          { productVariantId: 31618, quantity: 5 },
          { productVariantId: 31619, quantity: 1 },
          { productVariantId: 31621, quantity: 10 },
        ],
      },
    },
    {
      customerId: "05ea35f1-5438-43ff-a654-c3abb7f91073",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f798",
      number: "6661166666",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYTY5MzRhN2MtYzE0ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY5NzE3MmIiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMzODgzMywiZXhwIjoxNjk5MzQwMDMzfQ.D3VwzDs5pXhDvftu6Qfq3UR_HL-YXMAU6hxcLeA6tHI",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYTY5MzRhN2MtYzE0ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
      orderPayLoad: {
        customerId: "05ea35f1-5438-43ff-a654-c3abb7f91073",
        sellerWorkspaceId: "",
        lines: [
          { productVariantId: 31778, quantity: 1 },
          { productVariantId: 31781, quantity: 10 },
          { productVariantId: 31821, quantity: 6 },
          { productVariantId: 31829, quantity: 20 },
          { productVariantId: 31835, quantity: 10 },
          { productVariantId: 31838, quantity: 25 },
          { productVariantId: 31839, quantity: 4 },
          { productVariantId: 31840, quantity: 10 },
          { productVariantId: 31858, quantity: 10 },
          { productVariantId: 31859, quantity: 12 },
          { productVariantId: 31870, quantity: 10 },
          { productVariantId: 31871, quantity: 10 },
          { productVariantId: 31875, quantity: 10 },
          { productVariantId: 31885, quantity: 10 },
          { productVariantId: 31886, quantity: 10 },
          { productVariantId: 31902, quantity: 30 },
          { productVariantId: 31903, quantity: 30 },
          { productVariantId: 31904, quantity: 30 },
          { productVariantId: 31905, quantity: 1 },
          { productVariantId: 31908, quantity: 30 },
        ],
      },
    },
    {
      customerId: "ab2eb2bb-9798-4cc7-8440-a16fdf3a7b47",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "4242433333",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiY2U0MmFkZDQtMzAxOC00ZjIwLWE2NmUtYzUxMjVjZTQyMmYyIiwid29ya3NwYWNlSWQiOiJiMzdhYzRjMy0yMzAzLTRjY2MtODRhNS1kMzNiNzAxZjQ2ZDkiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMyOTA2MywiZXhwIjoxNjk5MzMwMjYzfQ.7jUCiGgYpNhOCY7f63IF83GAwvO3SBnKortBcT4tAeQ",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYmE3NmY2N2YtMjIxOS00NmNmLWJmZmEtYmMzZTNhYTMwMDgxIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTA5MzEsImV4cCI6MTcyODY0NjkzMX0.hPs7XoQJjbeEaLUSJjHCKRln7eq3MMVlDER5m_JnG2M",
      orderPayLoad: {
        customerId: "ab2eb2bb-9798-4cc7-8440-a16fdf3a7b47",
        sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
        lines: [
          { productVariantId: 31604, quantity: 10 },
          { productVariantId: 31618, quantity: 5 },
          { productVariantId: 31619, quantity: 1 },
          { productVariantId: 31620, quantity: 1 },
          { productVariantId: 31621, quantity: 10 },
          { productVariantId: 31622, quantity: 5 },
          { productVariantId: 31623, quantity: 1 },
          { productVariantId: 31624, quantity: 1 },
          { productVariantId: 31625, quantity: 10 },
          { productVariantId: 31626, quantity: 10 },
          { productVariantId: 31627, quantity: 30 },
          { productVariantId: 31628, quantity: 1 },
          { productVariantId: 31629, quantity: 1 },
          { productVariantId: 31630, quantity: 1 },
          { productVariantId: 31631, quantity: 1 },
          { productVariantId: 31632, quantity: 1 },
          { productVariantId: 31633, quantity: 10 },
          { productVariantId: 31634, quantity: 1 },
          { productVariantId: 31636, quantity: 5 },
          { productVariantId: 31637, quantity: 10 },
        ],
      },
    },
    {
      customerId: "fd7373b1-3011-42b8-a6f8-7ab77699f265",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "3131313131",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYmE3NmY2N2YtMjIxOS00NmNmLWJmZmEtYmMzZTNhYTMwMDgxIiwid29ya3NwYWNlSWQiOiJmMjQ1YzEyZi03ZmM3LTQ2ZDMtODYzNS00ODFlYmUwYmE1MmQiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMzNzU3OSwiZXhwIjoxNjk5MzM4Nzc5fQ.-oozvFxkbAeRnuOx1jBDHrAw9p3DJYZLj3x1bZ1E5Ss",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYmE3NmY2N2YtMjIxOS00NmNmLWJmZmEtYmMzZTNhYTMwMDgxIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTA5MzEsImV4cCI6MTcyODY0NjkzMX0.hPs7XoQJjbeEaLUSJjHCKRln7eq3MMVlDER5m_JnG2M",
      orderPayLoad: {
        customerId: "fd7373b1-3011-42b8-a6f8-7ab77699f265",
        sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
        lines: [
          { productVariantId: 31604, quantity: 10 },
          { productVariantId: 31618, quantity: 5 },
          { productVariantId: 31619, quantity: 1 },
          { productVariantId: 31621, quantity: 10 },
          { productVariantId: 31622, quantity: 5 },
          { productVariantId: 31623, quantity: 1 },
          { productVariantId: 31624, quantity: 1 },
          { productVariantId: 31625, quantity: 10 },
          { productVariantId: 31626, quantity: 10 },
          { productVariantId: 31627, quantity: 30 },
          { productVariantId: 31628, quantity: 1 },
          { productVariantId: 31633, quantity: 10 },
          { productVariantId: 31636, quantity: 5 },
          { productVariantId: 31637, quantity: 10 },
          { productVariantId: 31638, quantity: 30 },
          { productVariantId: 31640, quantity: 10 },
          { productVariantId: 31641, quantity: 1 },
          { productVariantId: 31642, quantity: 1 },
          { productVariantId: 31643, quantity: 5 },
          { productVariantId: 31644, quantity: 1 },
        ],
      },
    },
    {
      customerId: "2e5e59bf-2a77-4e6b-8e4e-10ea25d72e8d",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "9211420420",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiZTM1MTQxYmEtZjc3Ni00MWVjLTg1NjgtNDJiMjlmOTdjYzA3Iiwid29ya3NwYWNlSWQiOiJlOTEyODYwNi02MTg4LTRlM2EtODVhZi1kYjdkYzNmN2FhM2IiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTMzNzU3NSwiZXhwIjoxNjk5MzM4Nzc1fQ.2lbCqXedta6--ui6i1wA-TKkSHHWXbUoLX_Jdxunm2I",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiZTM1MTQxYmEtZjc3Ni00MWVjLTg1NjgtNDJiMjlmOTdjYzA3Iiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTAwMzAsImV4cCI6MTcyODY0NjAzMH0.vL0fsLgTxeLra_k7vTtCiZEmZPh4DR3W9y8z0wYBVJc",
      orderPayLoad: {
        customerId: "2e5e59bf-2a77-4e6b-8e4e-10ea25d72e8d",
        sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
        lines: [
          { productVariantId: 31604, quantity: 10 },
          { productVariantId: 31618, quantity: 5 },
          { productVariantId: 31619, quantity: 1 },
          { productVariantId: 31620, quantity: 1 },
          { productVariantId: 31621, quantity: 10 },
          { productVariantId: 31622, quantity: 5 },
          { productVariantId: 31623, quantity: 1 },
          { productVariantId: 31624, quantity: 1 },
          { productVariantId: 31625, quantity: 10 },
          { productVariantId: 31626, quantity: 10 },
          { productVariantId: 31627, quantity: 30 },
          { productVariantId: 31628, quantity: 1 },
          { productVariantId: 31629, quantity: 1 },
          { productVariantId: 31630, quantity: 1 },
          { productVariantId: 31631, quantity: 1 },
          { productVariantId: 31632, quantity: 1 },
          { productVariantId: 31633, quantity: 10 },
          { productVariantId: 31634, quantity: 1 },
          { productVariantId: 31636, quantity: 5 },
          { productVariantId: 31637, quantity: 10 },
        ],
      },
    },
  ];
  const index = __VU - 1;

  performLoadTest(
    customersData[index].token,
    customersData[index].refreshToken,
    customersData[index].sellerWorkspaceId,
    customersData[index].customerId,
    customersData[index].orderPayLoad
  );
  sleep(10);
}
