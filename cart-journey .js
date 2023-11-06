import http from "k6/http";
import { sleep } from "k6";
import { Counter } from "k6/metrics";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

const apiHost = "https://api-uat.beta.pharmconnect.com";
let customersData = [];

export let options = {
  vus: 1,
  duration: "1s",
  maxDuration: "60s",
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

const getProductsData = (customerId, sellerWorkspaceId) => {
  return {
    customerId: customerId,
    sellerWorkspaceId: sellerWorkspaceId,
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
  };
};

const performLoadTest = (
  token,
  refreshToken,
  sellerWorkspaceId,
  customerId
) => {
  const addItemToActiveOrderPayload = getProductsData(
    customerId,
    sellerWorkspaceId
  );

  const addItemToActiveOrderResponse = makeRequestWithAutoRetry(
    `commerce-v2/orders/additemtoactiveorder/${sellerWorkspaceId}`,
    addItemToActiveOrderPayload,
    findTokenByCustomerId(customerId),
    refreshToken
  );

  console.log(
    addItemToActiveOrderResponse.body.errors,
    customerId,
    "@@@@@@@@@"
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
    // {
    //   customerId: "05ea35f1-5438-43ff-a654-c3abb7f91073",
    //   sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
    //   token:
    //     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYTY5MzRhN2MtYzE0ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY5NzE3MmIiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTY5OTI5NzM5NSwiZXhwIjoxNjk5Mjk4NTk1fQ.W9o0at_IojzXx94lUS6hGgmnKDnqYUdnh8R2_zyzJ9I",
    //   refreshToken:
    //     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYTY5MzRhN2MtYzE0ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
    //   number: "6661166666",
    // },
    {
      customerId: "ab2eb2bb-9798-4cc7-8440-a16fdf3a7b47",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "4242433333",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2vyIjp7ImlkIjoiYTY5MzRhN2MtYzE4ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYAWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY9W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiY2U0MmFkZDQtMzAxOC00ZjIwLWE2NmUtYzUxMjVjZTQyMmYyIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTEwMjcsImV4cCI6MTcyODY0NzAyN30.Zv8ITlZ7XgT3E-XCzncOP1wUFG0U1mBTIYthDw62MtM",
    },
    {
      customerId: "b35c50f7-9509-4fb0-88fd-d2e08055eb2e",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "9898989822",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2vyIjp7ImlkIjoiYTY5MzRhN2MtYzE4ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYAWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY9W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiZTA0ZjI0MjYtNjE5Zi00NzJmLWE0YWItODBkNzJiZWMyN2NmIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcwMzg2MzcsImV4cCI6MTcyODU3NDYzN30.f6nuqv1ycdIkYF8W_ChK7pUQz90DUUzC4jGHI-oWcnY",
    },
    {
      customerId: "2e5e59bf-2a77-4e6b-8e4e-10ea25d72e8d",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "9211420420",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2vyIjp7ImlkIjoiYTY5MzRhN2MtYzE4ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYAWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY9W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiZTM1MTQxYmEtZjc3Ni00MWVjLTg1NjgtNDJiMjlmOTdjYzA3Iiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTAwMzAsImV4cCI6MTcyODY0NjAzMH0.vL0fsLgTxeLra_k7vTtCiZEmZPh4DR3W9y8z0wYBVJc",
    },
    {
      customerId: "991a4e99-bd76-4d24-9f04-8a0c2e74a26c",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "9898989811",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2vyIjp7ImlkIjoiYTY5MzRhN2MtYzE4ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYAWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY9W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYzcxODljZTctNDIwYS00NWJhLTkwMTgtNmZmZjU2OTU5NWJkIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcwMzg1NTAsImV4cCI6MTcyODU3NDU1MH0.0R_uJOqtfKMluLatYS0Tni3zNah_ZVvaPv6SwtZCQMg",
    },
    {
      customerId: "42c6f42c-2fbc-4122-b7be-f6ebe2aba27e",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f797",
      number: "4443212344",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2vyIjp7ImlkIjoiYTY5MzRhN2MtYzE4ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYAWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY9W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiZDE2NTZlM2QtODk3NC00MDc4LTkwYjctYzM3OWNjMzRjOTlkIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTE0NTAsImV4cCI6MTcyODY0NzQ1MH0.z8PMgx5AftktbaR_2LVHP8Vfvcs_Nao7u2M5sAV8N_c",
    },
    {
      customerId: "0938ed8d-09e0-42f3-af27-126d743b4e2b",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f798",
      number: "9898989833",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2vyIjp7ImlkIjoiYTY5MzRhN2MtYzE4ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYAWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY9W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYTdjODU3MTYtNjYyNi00NDllLWJiNTItMzBhNjFjZTQ3NmFkIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcwMzg2MjQsImV4cCI6MTcyODU3NDYyNH0.CF09NLKqk4NLtBUF4i7aRY_JMAGMxNigUVyOfU6V8eo",
    },
    {
      customerId: "220d149b-7bba-4a29-a856-5eb0f42c01b2",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f799",
      number: "3331113331",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2vyIjp7ImlkIjoiYTY5MzRhN2MtYzE4ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYAWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY9W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiODdlYTVlZDYtNmQ1ZS00NzMwLWFmNjYtZTcwYmNkM2E0NGQ1Iiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTEzMDEsImV4cCI6MTcyODY0NzMwMX0.ne4eW9TIchHBgXQfKFLGoKNMocF74Yvm9OoVUitqIHA",
    },
    {
      customerId: "fd7373b1-3011-42b8-a6f8-7ab77699f265",
      sellerWorkspaceId: "8ef5d569-3419-44e5-bb33-3ecfd260f796",
      number: "3131313131",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2vyIjp7ImlkIjoiYTY5MzRhN2MtYzE4ZC00NzBlLTk3NGQtYzliZmZjOGJlMzM0Iiwid29ya3NwYAWNlSWQiOiI4MWI0MzM3OS1iZGZjLTQ2YTktOGNiZC1iMDgwYjY9W119LCJpYXQiOjE2OTcxMTExNzYsImV4cCI6MTcyODY0NzE3Nn0.JsEG2h6EKj3G1vjwk-nK2tqJLCBhvnwkUmPcEPtJsfw",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiYmE3NmY2N2YtMjIxOS00NmNmLWJmZmEtYmMzZTNhYTMwMDgxIiwid29ya3NwYWNlSWQiOiIiLCJ3b3Jrc3BhY2VSb2xlcyI6W119LCJpYXQiOjE2OTcxMTA5MzEsImV4cCI6MTcyODY0NjkzMX0.hPs7XoQJjbeEaLUSJjHCKRln7eq3MMVlDER5m_JnG2M",
    },
  ];
  const index = __VU;

  performLoadTest(
    customersData[index].token,
    customersData[index].refreshToken,
    customersData[index].sellerWorkspaceId,
    customersData[index].customerId
  );
  sleep(1);
}
