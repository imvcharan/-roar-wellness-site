import type { Metadata } from "next";
import { AppointmentPage } from "@/components/site/AppointmentPage";

export const metadata: Metadata = {
  title: "Schedule an Appointment | Roar Wellness",
  description: "Request a confidential appointment with the Roar Wellness team to talk through care and recovery options.",
};

export default function AppointmentRoute() {
  return <AppointmentPage />;
}
