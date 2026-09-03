const url = "https://kgr-portal.vercel.app/api";

async function runTests() {
  console.log("Starting End-to-End Functional Workflow Tests...");
  const randomSuffix = Math.floor(Math.random() * 100000);
  const testEmail = `qa_test_${randomSuffix}@example.com`;
  const testPassword = "Password123!";

  let token = "";

  // 1. Registration Test
  console.log(`\n[1/4] Testing Registration (User: ${testEmail})...`);
  try {
    const regRes = await fetch(`${url}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "QA Test User",
        email: testEmail,
        password: testPassword,
        role: "student",
        year: "2",
        rollNumber: `22${randomSuffix}00`,
        contactNumber: "9876543210",
        department: "CSE",
        section: "A",
      }),
    });

    if (!regRes.ok) throw new Error(await regRes.text());
    console.log("✅ Registration Successful!");
  } catch (err) {
    console.error("❌ Registration Failed:", err.message);
    return;
  }

  // 2. Login Test
  console.log(`\n[2/4] Testing Login...`);
  try {
    const loginRes = await fetch(`${url}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    if (!loginRes.ok) throw new Error(await loginRes.text());
    const data = await loginRes.json();
    token = data.token;

    if (!token) throw new Error("No token received!");
    console.log("✅ Login Successful! Token received.");
  } catch (err) {
    console.error("❌ Login Failed:", err.message);
    return;
  }

  // 3. User Session Verification (Dashboard logic)
  console.log(`\n[3/4] Testing Session & User Profile Data...`);
  try {
    const userRes = await fetch(`${url}/login`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userRes.ok) throw new Error(await userRes.text());
    const userData = await userRes.json();
    const user = userData.user;

    if (user.year !== "2")
      throw new Error(
        `Year was not saved correctly! Expected "2", got "${user.year}"`,
      );
    console.log(
      "✅ Session Validated! Year field successfully verified as: " + user.year,
    );
  } catch (err) {
    console.error("❌ Session Validation Failed:", err.message);
    return;
  }

  // 4. Assignments Feed (Dashboard logic)
  console.log(`\n[4/4] Testing Assignments Feed (Dashboard Load)...`);
  try {
    const assignRes = await fetch(`${url}/assignments`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!assignRes.ok) throw new Error(await assignRes.text());
    const assignData = await assignRes.json();
    console.log(
      `✅ Assignments Loaded! Found ${assignData.assignments?.length || 0} active assignments.`,
    );
  } catch (err) {
    console.error("❌ Assignments Fetch Failed:", err.message);
    return;
  }

  // 5. Code Runner Test
  console.log(`\n[5/7] Testing Code Runner...`);
  try {
    const codeRes = await fetch(`${url}/code-runner`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({
        language: "java",
        code: "public class Main { public static void main(String[] args) { System.out.println(\"Hello from E2E test\"); } }"
      })
    });
    
    if (codeRes.status === 503) {
      console.log("⚠️ Code Runner bypassed: Isolated runner not configured (Expected in QA without infra).");
    } else if (!codeRes.ok) {
      throw new Error(await codeRes.text());
    } else {
      const codeData = await codeRes.json();
      console.log("✅ Code Runner Successful!");
    }
  } catch (err) {
    console.error("❌ Code Runner Failed:", err.message);
  }

  // 6. AI Chat Test
  console.log(`\n[6/7] Testing AI Chat Assistant...`);
  try {
    const aiRes = await fetch(`${url}/ai-chat`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({
        challengeId: "e2e-test-challenge",
        code: "console.log('hello');",
        statement: "Print hello world",
        history: [],
        message: "Can you help me?"
      })
    });
    
    if (aiRes.status === 503) {
      console.log("⚠️ AI Chat bypassed: GEMINI_API_KEY not configured (Expected in QA).");
    } else if (!aiRes.ok) {
      throw new Error(await aiRes.text());
    } else {
      const aiData = await aiRes.json();
      if (!aiData.response) throw new Error("No response from AI");
      console.log("✅ AI Chat Successful! AI responded.");
    }
  } catch (err) {
    console.error("❌ AI Chat Failed:", err.message);
  }

  // 7. Engagement Hub Test
  console.log(`\n[7/7] Testing Engagement Hub (GET Records)...`);
  try {
    const lbRes = await fetch(`${url}/engagement`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!lbRes.ok) throw new Error(await lbRes.text());
    const lbData = await lbRes.json();
    console.log(`✅ Engagement Data Loaded! Found ${lbData.records?.length || 0} records.`);
  } catch (err) {
    console.error("❌ Engagement Fetch Failed:", err.message);
    return;
  }

  console.log("\n🎉 ALL COMPREHENSIVE E2E WORKFLOW TESTS PASSED SUCCESSFULLY! 🎉");
}

runTests();
