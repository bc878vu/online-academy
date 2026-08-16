import { verifyFirebaseIdToken, firestoreQuery, firestoreGet, firestoreSet } from "./_firebase.js";

const ADMIN_EMAIL = "admin@onlineacademy.com";
const json = (res, status, body) => { res.status(status).setHeader("Cache-Control", "no-store").json(body); };
const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const idFromName = (name) => String(name || "").split("/").pop();
const now = () => new Date().toISOString();

async function authUser(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return null;
  try { return await verifyFirebaseIdToken(header.slice(7)); } catch { return null; }
}
function requireUser(user) { if (!user?.localId) { const e = new Error("Please login to continue."); e.status = 401; throw e; } }
function requireAdmin(user) { requireUser(user); if (user.email !== ADMIN_EMAIL) { const e = new Error("Admin access required."); e.status = 403; throw e; } }

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const scope = String(req.query?.scope || "public");
      if (scope === "public") {
        const [courseRows, reviewRows] = await Promise.all([
          firestoreQuery("courses", [{ field: "published", value: true }]),
          firestoreQuery("reviews", [{ field: "status", value: "published" }]),
        ]);
        const courses = courseRows.map(row => ({ id: idFromName(row.name), ...row.fields })).slice(0, 40);
        const reviews = reviewRows.map(row => ({ id: idFromName(row.name), ...row.fields }))
          .sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 30);
        return json(res, 200, { courses, reviews });
      }
      if (scope === "admin") {
        const user = await authUser(req); requireAdmin(user);
        const [contacts, feedback, reviews] = await Promise.all([
          firestoreQuery("contactMessages"), firestoreQuery("feedback"), firestoreQuery("reviews"),
        ]);
        const items = [
          ...contacts.map(r=>({id:idFromName(r.name),kind:"Contact",...r.fields})),
          ...feedback.map(r=>({id:idFromName(r.name),kind:"Feedback",...r.fields})),
          ...reviews.map(r=>({id:idFromName(r.name),kind:"Review",...r.fields})),
        ].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,150);
        return json(res,200,{items});
      }
      return json(res,400,{error:"Invalid scope."});
    }
    if (req.method !== "POST") return json(res,405,{error:"Method not allowed."});
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const action = String(body.action || "");
    const user = await authUser(req);

    if (action === "review") {
      requireUser(user);
      const courseId=clean(body.courseId,160), rating=Number(body.rating), review=clean(body.review,1200);
      if (!courseId) throw Object.assign(new Error("Select a course first."),{status:400});
      if (!Number.isInteger(rating) || rating<1 || rating>5) throw Object.assign(new Error("Please select 1–5 stars."),{status:400});
      if (review.length<8) throw Object.assign(new Error("Please write at least 8 characters in your review."),{status:400});
      const course=await firestoreGet(`courses/${courseId}`);
      if (!course?.fields?.published) throw Object.assign(new Error("This course is not available for review."),{status:400});
      const id=`${user.localId}_${courseId}`;
      const existing=await firestoreGet(`reviews/${id}`);
      const data={userId:user.localId,userName:clean(user.displayName || "Student",80),courseId,courseTitle:clean(course.fields.title || "Course",160),rating,review,status:"published",verified:existing?.fields?.verified === true,createdAt:existing?.fields?.createdAt || now(),updatedAt:now()};
      await firestoreSet(`reviews/${id}`,data);
      return json(res,200,{ok:true,review:{id,...data}});
    }

    if (action === "contact" || action === "feedback") {
      const name=clean(body.name || user?.displayName || "Visitor",80), email=clean(body.email || user?.email || "",160), message=clean(body.message,2000);
      if (message.length<8) throw Object.assign(new Error("Please provide more detail."),{status:400});
      const id=`${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
      if (action === "contact") {
        const subject=clean(body.subject,160); if(subject.length<3) throw Object.assign(new Error("Please enter a subject."),{status:400});
        await firestoreSet(`contactMessages/${id}`,{userId:user?.localId || null,name,email,subject,message,status:"new",honeypot:"",createdAt:now()});
      } else {
        await firestoreSet(`feedback/${id}`,{userId:user?.localId || null,name,email,type:clean(body.type || "Suggestion",40),message,status:"new",honeypot:"",createdAt:now()});
      }
      return json(res,200,{ok:true});
    }

    if (action === "status") {
      requireAdmin(user);
      const kind=String(body.kind||""), id=clean(body.id,200), status=clean(body.status,40);
      const collection = kind === "Contact" ? "contactMessages" : kind === "Feedback" ? "feedback" : kind === "Review" ? "reviews" : "";
      if(!collection || !id || !["new","in_progress","resolved","published","hidden"].includes(status)) throw Object.assign(new Error("Invalid status update."),{status:400});
      const existing=await firestoreGet(`${collection}/${id}`); if(!existing) throw Object.assign(new Error("Item not found."),{status:404});
      await firestoreSet(`${collection}/${id}`,{...existing.fields,status,updatedAt:now()});
      return json(res,200,{ok:true});
    }
    return json(res,400,{error:"Unknown action."});
  } catch(error) { return json(res,error?.status || 500,{error:error?.message || "Server error."}); }
}
