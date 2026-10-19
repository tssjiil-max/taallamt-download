import React from 'react';
import type {CompanionState} from './state';
import shakHeadReal from '../assets/shak-head-real.webp';

// Shakabumbo's body, rebuilt as a jointed vector rig so the character can genuinely walk,
// fall, sit and gesture instead of a single static illustration being slid or rocked.
// Every limb is two nested groups (thigh/shin, upper-arm/forearm) that rotate around real
// pivot points.
//
// The head — the single most recognizable part of the character, and the part a vector
// redraw could never truly match — is the REAL approved artwork itself: a crop of
// design/shakabumbo/originals/04-standing-white-hair-star.png (the exact file the brief
// pointed to), not a redrawn approximation. It is placed as a clipped <image>, so the face,
// the exact hairstyle, and the ear shading are the original pixels. Only the body below the
// neck remains vector, because that artwork is a single static asymmetric pose (one arm
// raised, one fist down) with no separate limb/torso sheets to decompose into independently
// rotating joints without visible warping or seams — matching it in vector color/shape
// (white suit, black joint rings with green lights, belt buckle, wide boots with a green
// ankle band) is what the brief allows when the source art can't supply moving parts, with
// the gap stated plainly rather than papered over: genuinely separate official limb/torso
// art (or a 3D/skeletal rig built from one) is what would let the body match pixel-for-pixel
// the way the head now does. The joints are driven entirely by CSS (see app.src.css), keyed
// off data-state/data-talking, so a reduced-motion viewer still sees the correct silhouette
// for each state, just without the animated transition.

export function ShakabumboRig({state,talking}:{state:CompanionState;talking:boolean}){
  return (
    <svg className="shakRig" data-state={state} data-talking={talking?'1':'0'} viewBox="0 0 220 300" width="100%" height="100%" role="img" aria-hidden="true">
      <g className="shakShadow"><ellipse cx="110" cy="286" rx="40" ry="8"/></g>
      <g className="shakBounce">
        {/* back arm (the one further from the viewer walks with an opposite phase) */}
        <g className="shakArm shakArmBack" style={{transformOrigin:'146px 116px'}}>
          <circle className="shakJointRing" cx="146" cy="116" r="11"/>
          <circle className="shakJointLight" cx="146" cy="116" r="5"/>
          <g className="shakUpperArm">
            <rect className="shakLimbPart" x="136" y="112" width="20" height="44" rx="10"/>
            <g className="shakForearm" style={{transformOrigin:'146px 154px'}}>
              <circle className="shakJointRing" cx="146" cy="154" r="9.5"/>
              <circle className="shakJointLight" cx="146" cy="154" r="4"/>
              <rect className="shakLimbPart" x="137" y="150" width="18" height="38" rx="9"/>
              <circle className="shakHand" cx="146" cy="194" r="13"/>
            </g>
          </g>
        </g>

        {/* back leg */}
        <g className="shakLeg shakLegBack" style={{transformOrigin:'128px 176px'}}>
          <circle className="shakJointRing" cx="128" cy="176" r="12"/>
          <circle className="shakJointLight" cx="128" cy="176" r="5"/>
          <rect className="shakThigh" x="117" y="170" width="22" height="52" rx="10"/>
          <g className="shakShin" style={{transformOrigin:'128px 220px'}}>
            <circle className="shakJointRing" cx="128" cy="220" r="9.5"/>
            <circle className="shakKneeLight" cx="128" cy="220" r="4"/>
            <rect className="shakLimbPart" x="118" y="216" width="20" height="44" rx="9"/>
            <g className="shakFoot">
              <rect className="shakBoot" x="108" y="252" width="40" height="22" rx="11"/>
              <rect x="108" y="266" width="40" height="8" rx="4" className="shakSole"/>
              <rect x="112" y="252" width="32" height="6" rx="3" className="shakBootBand"/>
            </g>
          </g>
        </g>

        {/* torso + head group, leans slightly as the character turns and walks */}
        <g className="shakTorsoGroup">
          <g className="shakTorso">
            <rect className="shakTorsoBody" x="74" y="100" width="72" height="82" rx="26"/>
            <circle className="shakShoulderPadL" cx="80" cy="110" r="10"/>
            <circle className="shakShoulderPadR" cx="140" cy="110" r="10"/>
            <rect x="90" y="150" width="40" height="7" rx="3.5" className="shakBelt"/>
            <rect x="103" y="148" width="14" height="11" rx="2.5" className="shakBuckle"/>
            <circle className="shakChestRing" cx="110" cy="130" r="13"/>
            <circle className="shakChestLight" cx="110" cy="130" r="10"/>
            <circle className="shakChestLightCore" cx="110" cy="130" r="4.6"/>
          </g>

          <g className="shakHead">
            <defs>
              <clipPath id="shakHeadClip">
                <ellipse cx="110" cy="70" rx="64" ry="62"/>
              </clipPath>
            </defs>
            <image
              className="shakHeadImg"
              href={shakHeadReal}
              x="48" y="14" width="124" height="118.6"
              clipPath="url(#shakHeadClip)"
              preserveAspectRatio="xMidYMid meet"
              style={{transformOrigin:'110px 70px'}}
            />
          </g>
        </g>

        {/* front leg */}
        <g className="shakLeg shakLegFront" style={{transformOrigin:'94px 176px'}}>
          <circle className="shakJointRing" cx="94" cy="176" r="12"/>
          <circle className="shakJointLight" cx="94" cy="176" r="5"/>
          <rect className="shakThigh" x="83" y="170" width="22" height="52" rx="10"/>
          <g className="shakShin" style={{transformOrigin:'94px 220px'}}>
            <circle className="shakJointRing" cx="94" cy="220" r="9.5"/>
            <circle className="shakKneeLight" cx="94" cy="220" r="4"/>
            <rect className="shakLimbPart" x="84" y="216" width="20" height="44" rx="9"/>
            <g className="shakFoot">
              <rect className="shakBoot" x="72" y="252" width="40" height="22" rx="11"/>
              <rect x="72" y="266" width="40" height="8" rx="4" className="shakSole"/>
              <rect x="76" y="252" width="32" height="6" rx="3" className="shakBootBand"/>
            </g>
          </g>
        </g>

        {/* front arm (nearer the viewer; points at the question, waves, claps, holds the star) */}
        <g className="shakArm shakArmFront" style={{transformOrigin:'74px 116px'}}>
          <circle className="shakJointRing" cx="74" cy="116" r="11"/>
          <circle className="shakJointLight" cx="74" cy="116" r="5"/>
          <g className="shakUpperArm">
            <rect className="shakLimbPart" x="64" y="112" width="20" height="44" rx="10"/>
            <g className="shakForearm" style={{transformOrigin:'74px 154px'}}>
              <circle className="shakJointRing" cx="74" cy="154" r="9.5"/>
              <circle className="shakJointLight" cx="74" cy="154" r="4"/>
              <rect className="shakLimbPart" x="65" y="150" width="18" height="38" rx="9"/>
              <circle className="shakHand" cx="74" cy="194" r="13"/>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
