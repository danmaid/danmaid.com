import crypto from "node:crypto";

export async function createIDToken() {
  const now = new Date();
  const payload = {
    iss: "https://danmaid.com",
    sub: "xyz",
    aud: "xxx",
    exp: (now.getTime() + 86400 * 1000).toString().slice(0, -3),
    iat: now.getTime().toString().slice(0, -3),
  };
  const pk = {
    alg: "RS256",
    d: "GMK4NPyc8sX-al-V7ScfLUs5QlJo1mluZE4vE8Z_AFNcS31cpMn9_KKQyJaaeF4jelW8Cvb-wUOoZsSnk4dpSNPTjpHVp60CtDETnCVtrtEBzEFlSLJzDBmIE7CcT4pZMUWmRwqLdHzY_31-fc1QftcjN_N0tNJSrl0Y8z-puVfqw412uegzUIlayypRp5O4SvII_2sEsUO-sD1NSY-L0X7xSKNXM2sXUDYB_FF1fWp_SHpF9qZryMkgTGJ5p1ic2Ba8tH7qV7fQ7LIFQVVgURgLqkxevBSHVFurL4ms0ZQnGULGLZd6lD3_aR5MBH9ov3Eklp--0fnEjTlOvBFwQQ",
    dp: "kgDJKDsLxV-hWUDou_96Tn-7TbsIRNHErA5CEdDwwuCXBvdRew06HiREJDeX33K6yN050O1PTPgm_8kqUea3eYwYwrvIhJciVt8mKiXjY_otO3h_Xq0ui-yefa5Qvr_yrVEGYslppnu34Vwq9XBw5pX90g61Lgtet1sZrZ7yQAE",
    dq: "Xn6iZAPHvvvxge_DL4PD_WxxrwjxSkfYJ8XgHKS9Up6xTOI8d3zgKjZ0EmlhtIPyRXYiWTsanSGrDFJnlmPbD1GiG8bjg3cNRJQVFZ9mueWnqeNnXATyR49KQCZhaFdgUeY6oldHptX3OMmNGs3LDP2iopvhDVs8S5C0jAf_9tU",
    e: "AQAB",
    ext: true,
    key_ops: ["sign"],
    kty: "RSA",
    n: "pbu-3Pdqe3jUyLimQRdZq9w4ip3H7PkPSChnvtViD8nXlndzVu6JCI69pwyO3B_QvaQYJp5K2V-0WF_OpDwGnwIvyrLvQqtonwNSZdNnZLZHRGizrSMTDhaOLG02A741z6pVqJpgs3j-7iltco8rSCjJ-oOR2uMGJIG-XrqqzC64hk_qxcmyt51vNnyY_7nHVwmd16vpVVuif_jgTANptLHpZMdGgD1bb13h7pMzSrznmvCxtd6pcCCRn6La0ILKNWVYwy9f1od2O8puKQ2EItPgLV4vqH1dS4BankhrtjfZ7nqWVj7KgEm1pZGftZoCflJLLXiwWjc4PxidzoBN9Q",
    p: "4oeIyCvB8SLBgiWi4-21__bAFOMK3BXHW0QoiKYHGhfRTnA-wPY8xZ1MdqpBTaPYBZNpAcnkbQoDDd4fMcBx2BH0EM2k2cq1axBF3-ENP2dHseCM8ME-aB28YKjQkGRfTfxvP1Hq9Ppdp69lV9OgVWAG1i9ddYfVvNwHz3hvgkE",
    q: "u0tswvAGlj7DWnqZxcENEgz8FgodLrvVCui_uDBTzEgIsvfPs4QmrHEeGeLX4t7kZN7CvtwNGhISbTl4eBBNE4Ie7wtWRoV_tPDcc-QRgfku8CzabAntj8t9dcX9tr-I5uVY6NeP0IldYtI_8Foao8FofA0wt27z28YOq29PtrU",
    qi: "p0Ufl0XwS0ITA0KIcGMMqycrTMKXSA6ov8G2CpMA9OPHhjs_tCLoePMDs91N7J1xW4Q70WiE83NX-ZV9_2dkTPZTxYpCqx03U1awU-p6tajHo3k84lf0B7PMKSuCgUbbjWB2uIw7j0xjK48GXH5xbvE0UjyIpkuh_YWIkFfwAiM",
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    pk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const header = { kid: "xxx", alg: "RS256" };
  const x =
    Buffer.from(JSON.stringify(header)).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify(payload)).toString("base64url");

  const sign = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(x)
  );
  return x + "." + Buffer.from(sign).toString("base64url");
}
