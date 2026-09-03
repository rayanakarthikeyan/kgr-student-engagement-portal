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
        rollNumber: "2200000000",
        contactNumber: "9876543210",
        department: "CSE",
        section: "A"
      })
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
      body: JSON.stringify({ email: testEmail, password: testPassword })
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
    const userRes = await fetch(`${url}/users?email=${testEmail}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!userRes.ok) throw new Error(await userRes.text());
    const userData = await userRes.json();
    const user = userData.users[0];
    
    if (user.year !== "2") throw new Error(`Year was not saved correctly! Expected "2", got "${user.year}"`);
    console.log("✅ Session Validated! Year field successfully verified as: " + user.year);
  } catch (err) {
    console.error("❌ Session Validation Failed:", err.message);
    return;
  }

  // 4. Assignments Feed (Dashboard logic)
  console.log(`\n[4/4] Testing Assignments Feed (Dashboard Load)...`);
  try {
    const assignRes = await fetch(`${url}/assignments`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!assignRes.ok) throw new Error(await assignRes.text());
    const assignData = await assignRes.json();
    console.log(`✅ Assignments Loaded! Found ${assignData.assignments?.length || 0} active assignments.`);
  } catch (err) {
    console.error("❌ Assignments Fetch Failed:", err.message);
    return;
  }

  console.log("\n🎉 ALL E2E WORKFLOW TESTS PASSED SUCCESSFULLY! 🎉");
}

runTests();
