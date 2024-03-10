const first = document.querySelector("#ist");
const second = document.querySelector("#sec");
const third = document.querySelector("#third");
const fourth = document.querySelector("#fourth");
const mailbtn = document.querySelector("#mailbtn");

function clickEvent(first, next, prev) {
  if (first.value.length) {
    document.getElementById(next).focus();
  } else {
    document.getElementById(prev).focus();
  }
}
function createNumber() {
  const one = first.value;
  const sec = second.value;
  const thi = third.value;
  const fou = fourth.value;

  const number = 1000 * one + 100 * sec + 10 * thi + 1 * fou;
  return number;
}

mailbtn.onclick = function () {
  console.log("clicked!");
  const number = createNumber();
  verifyOtp(number);
};

async function verifyOtp(otp) {
  console.log(otp);
  try {
    const response = await fetch("http://localhost:3000/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ otp }),
    });

    console.log("Response status:", response.status);

    if (response.ok) {
      const result = await response.json();

      if (result.success) {
        // OTP is valid, proceed with login or other actions
        console.log("OTP verification successful");
        alert("Verification Successful, You can now Login");
        window.location.href = "/login";
      } else {
        // OTP is invalid, display an error message
        alert("Incorrect OTP!");
        window.location.href = "/verified";
      }
    } else {
      // Handle non-successful response (e.g., 404, 500, etc.)
      console.log(
        `Error during OTP verification: ${response.status} - ${response.statusText}`
      );
    }
  } catch (err) {
    console.log("Error:", err);
  }
}
