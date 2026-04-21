# Lens Project Notes

Use this folder as the handoff point for actual Lens Studio scene files.

Recommended scene objects:

- `SharedOriginGuide`: visual calibration marker used during host alignment.
- `MoleculeTray`: parent object for atom prefabs near the learner.
- `MoleculeAssemblyBoard`: anchored bond-slot layout relative to the shared origin.
- `ScoreboardPanel`: world-space UI with team score, round, and quiz progress.
- `PresenceBadges`: lightweight labels for nearby participants.

This repository does not fabricate a Lens Studio `.lsproj` or binary asset graph. Instead, it provides the TypeScript-side architecture and documents how to bind the real project resources here.
