"use client";

import React from "react";
import Skiper10, { type Skiper10Props } from "@/components/ui/skiper-ui/skiper10";

export default function StaircaseIntro(props: Skiper10Props) {
  return (
    <Skiper10
      columns={22}
      duration={0.60}
      staggerDelay={0.065}
      ease={[0.76, 0, 0.24, 1]}
      timingMode="synchronized"
      brandTitle="ZENITHROw"
      emblemText="HAMDAN SPORTS CHAMPIONSHIP 2026"
      brandSubtitle="KICK THE DRUGS"
      showCounter={false}
      minDisplayTime={1400}
      {...props}
    />
  );
}
