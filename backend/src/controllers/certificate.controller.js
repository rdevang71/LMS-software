import { Certificate } from "../models/index.js";
import { certificateAchievement } from "../utils/certificate.js";

export async function verifyCertificate(request, response, next) {
  try {
    const certificate = await Certificate.findOne({
      certificateId: request.params.certificateId,
    }).lean();
    if (!certificate)
      return response
        .status(404)
        .json({ message: "Certificate not found or invalid" });
    const achievement = certificateAchievement(
      certificate.marksObtained,
      certificate.maxMarks,
    );
    response.json({
      certificate: {
        id: certificate.certificateId,
        course: certificate.course,
        student: certificate.student,
        instructor: certificate.instructor,
        issued: certificate.issued,
        courseDuration: certificate.courseDuration ?? "",
        skills: certificate.skills ?? [],
        marksObtained: certificate.marksObtained,
        maxMarks: certificate.maxMarks,
        remarks: certificate.remarks ?? "",
        ...achievement,
      },
    });
  } catch (error) {
    next(error);
  }
}
