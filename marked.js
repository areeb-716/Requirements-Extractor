// -------------------------------
// SHOW HINTS FOR NOT SURE OPTIONS
// -------------------------------
document.querySelectorAll(".maybe").forEach(function(sel){
    sel.addEventListener("change", function(){
        let hint = this.nextElementSibling;
        if (this.value.toLowerCase().includes("not") || this.value.toLowerCase().includes("can't")) {
            hint.style.display = "block";
        } else {
            hint.style.display = "none";
        }
    });
});

// ---------------------------------
// AUTO-SAVE
// ---------------------------------
const allInputs = document.querySelectorAll("input, select, textarea");

// Restore
window.addEventListener("load", function(){
    allInputs.forEach(function(item){
        let savedValue = localStorage.getItem("ans_" + item.name);
        if(savedValue !== null) item.value = savedValue;
    });
});

// Save
allInputs.forEach(function(item){
    if(!item.name){
        item.name = "q_" + Math.random().toString(36).substring(2,10);
    }
    item.addEventListener("input", function(){
        localStorage.setItem("ans_" + item.name, item.value);
    });
});

// ---------------------------------
// GENERATE AI REPORT
// ---------------------------------
async function generateAIReport() {

    const apiKey = "";

    // Collect all form answers
    let data = "";
    allInputs.forEach(function(item){
        let label = "";
        let prev = item.previousElementSibling;
        while(prev && prev.tagName !== "LABEL"){
            prev = prev.previousElementSibling;
        }
        label = prev ? prev.innerText.trim() : item.name;
        data += label + ":\n" + item.value + "\n\n";
    });

    // Loading UI
    const box = document.getElementById("aiReportBox");
    box.style.display = "block";
    box.innerText = "⏳ Generating AI Report... Please wait.";

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
                model: "nvidia/nemotron-nano-12b-v2-vl:free",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional software requirements analyst. Summarize requirements clearly."
                    },
                    {
                        role: "user",
                        content: "Here are the ACTUAL answers from the requirements questionnaire:\n\n" + data +
                                 "\n\nGenerate a professional Software Requirements Summary Report using the ACTUAL DATA provided above. DO NOT use placeholders like [Business Name] or [Insert Details]. Use the real information from the questionnaire.\n\nStructure:\n1. Executive Summary (2-3 sentences about the business and goals)\n2. Business Context (what they do, current situation)\n3. Problems & Pain Points (specific issues mentioned)\n4. Functional Requirements (what the system must do)\n5. Non-Functional Requirements (performance, security, etc.)\n6. Data Requirements (what info to store)\n7. Integration Needs (if any)\n8. Timeline & Budget (if mentioned)\n9. Future Enhancements (features for later)\n10. Assumptions (only if data is missing)\n\nUse the actual names, details, and information provided. Be specific and professional."
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error("API request failed: " + response.statusText);
        }

        const result = await response.json();
        const aiText = result.choices[0].message.content;

        // Render markdown using marked.js
        box.innerHTML = marked.parse(aiText);
        document.getElementById("downloadAIReport").style.display = "inline-block";
        window.generatedReportText = aiText;

    } catch (error) {
        box.innerText = "Error generating report: " + error.message;
    }
}

// ---------------------------------
// FORM VALIDATION
// ---------------------------------
document.getElementById("reqForm").addEventListener("submit", function(e){
    e.preventDefault();

    let requiredFields = document.querySelectorAll("[data-required='true']");
    let firstError = null;

    requiredFields.forEach(field => {
        field.classList.remove("error");
        field.style.backgroundImage = "";

        if(field.value.trim() === ""){
            field.classList.add("error");
            field.style.backgroundImage =
                "url('data:image/svg+xml;utf8,<svg width=\"20\" height=\"20\" viewBox=\"0 0 512 512\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"256\" cy=\"256\" r=\"230\" fill=\"%23ff0000\"/><text x=\"50%\" y=\"65%\" font-size=\"280\" text-anchor=\"middle\" fill=\"white\">!</text></svg>')";
            field.style.backgroundRepeat = "no-repeat";
            field.style.backgroundPosition = "98% center";

            if(!firstError) firstError = field;
        }
    });

    if(firstError){
        alert("⚠ Please fill the required fields.");
        firstError.scrollIntoView({ behavior:"smooth" });
        return;
    }

    document.querySelector(".messageBox").style.display = "block";
});


// DOWNLOAD ANSWERS (ENHANCED FORMATTING)
// ---------------------------------
function downloadAnswers(){
    let data = "";
    let sections = document.querySelectorAll("h3");
    
    sections.forEach(function(section){
        // Section header with enhanced formatting
        data += "================================================================================\n";
        data += section.innerText.toUpperCase() + "\n";
        data += "================================================================================\n\n";
        
        // Find all labels and their corresponding inputs after this h3 until the next h3
        let currentElement = section.nextElementSibling;
        while(currentElement && currentElement.tagName !== "H3"){
            if(currentElement.tagName === "LABEL"){
                let label = currentElement.innerText.trim();
                // The input should be the next sibling
                let input = currentElement.nextElementSibling;
                while(input && input.tagName !== "INPUT" && input.tagName !== "SELECT" && input.tagName !== "TEXTAREA"){
                    input = input.nextElementSibling;
                }
                if(input && input.value.trim() !== ""){
                    // Format as a bullet point with indented answer
                    data += "• " + label + "\n";
                    data += "    " + input.value.trim().replace(/\n/g, "\n    ") + "\n\n";  // Indent multi-line answers
                }
            }
            currentElement = currentElement.nextElementSibling;
        }
        data += "\n";  // Extra space between sections
    });
    
    let blob = new Blob([data], { type: "text/plain" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "requirements_answers.txt";
    link.click();
}



// ---------------------------------
// DOWNLOAD AI REPORT (FORMATTED)
// ---------------------------------
function downloadAIReportFile(){
    if(!window.generatedReportText) return;

    let data = window.generatedReportText;

    // Normalize line breaks
    data = data.replace(/\r\n/g, '\n');

    // Remove Markdown bullets (*) or other formatting
    data = data.replace(/^\s*[\*\-]\s+/gm, '• ');  // replace * or - at start with •
    data = data.replace(/\*\*(.*?)\*\*/g, '$1');    // remove bold **
    data = data.replace(/\*(.*?)\*/g, '$1');        // remove italic *
    data = data.replace(/`(.*?)`/g, '$1');          // remove inline code backticks

    // Add spacing and separators before major sections
    const sections = [
        "Executive Summary",
        "Business Context",
        "Problems & Pain Points",
        "Functional Requirements",
        "Non-Functional Requirements",
        "Data Requirements",
        "Integration Needs",
        "Timeline & Budget",
        "Future Enhancements",
        "Assumptions"
    ];

    sections.forEach(section => {
        const regex = new RegExp(`(${section}:)`, 'gi');
        data = data.replace(regex, '\n================================================================================\n$1\n================================================================================\n');
    });

    // Clean multiple consecutive blank lines
    data = data.replace(/\n{3,}/g, '\n\n');

    // Trim start and end
    data = data.trim() + '\n';

    // Download as TXT
    let blob = new Blob([data], { type: "text/plain" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "AI_Requirements_Summary.txt";
    link.click();
}


// ---------------------------------
// SIMPLE MARKDOWN RENDERER
// ---------------------------------
function renderMarkdown(text) {
    let html = text;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 style="color:#0d47a1; margin-top:25px; margin-bottom:10px; font-size:18px; border-bottom:2px solid #e3f2fd; padding-bottom:8px;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="color:#00448b; margin-top:30px; margin-bottom:12px; font-size:22px;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="color:#00448b; margin-top:0; margin-bottom:15px; font-size:26px; text-align:center;">$1</h1>');
    
    // Bold
    html = html.replace(/\\(.?)\\*/g, '<strong style="color:#0d47a1;">$1</strong>');
    
    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li style="margin-left:20px; margin-bottom:8px;">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li style="margin-left:20px; margin-bottom:8px;">$1</li>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li style="margin-left:20px; margin-bottom:8px;">$1</li>');
    
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li.?<\/li>\s)+/g, '<ul style="margin:10px 0; padding-left:20px;">$&</ul>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');
    
    // Code blocks
    html = html.replace(/([^]+)`/g, '<code style="background:#f5f5f5; padding:2px 6px; border-radius:4px; font-family:monospace; color:#d63384;">$1</code>');
    
    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr style="border:none; border-top:2px solid #e3f2fd; margin:20px 0;">');
    
    return html;
}