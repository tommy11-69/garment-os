<?php
/**
 * Garment OS — Workflow Domain Service
 * Manages Authoritative Workflow Presets and Versioned Snapshot Instantiations.
 */

require_once __DIR__ . '/../db.php';

class WorkflowService {

    public static function getAllPresets(): array {
        return Database::query("SELECT * FROM workflow_presets WHERE is_active = 1 ORDER BY name ASC");
    }

    public static function getPresetById(string $presetId): ?array {
        $preset = Database::queryOne("SELECT * FROM workflow_presets WHERE id = ? OR preset_code = ?", [$presetId, $presetId]);
        if (!$preset) return null;

        $version = Database::queryOne("SELECT * FROM workflow_preset_versions WHERE preset_id = ? AND is_current = 1", [$preset['id']]);
        if ($version) {
            $preset['current_version'] = $version['version_number'];
            $preset['stages'] = json_decode($version['stages_json'], true);
        }
        return $preset;
    }

    public static function getLatestVersion(string $presetId): ?array {
        return Database::queryOne(
            "SELECT * FROM workflow_preset_versions WHERE (preset_id = ? OR preset_id = (SELECT id FROM workflow_presets WHERE preset_code = ?)) AND is_current = 1",
            [$presetId, $presetId]
        );
    }

    public static function publishNewVersion(string $presetId, array $stages): array {
        return Database::transaction(function(PDO $db) use ($presetId, $stages) {
            $current = Database::queryOne("SELECT MAX(version_number) as max_v FROM workflow_preset_versions WHERE preset_id = ?", [$presetId]);
            $nextVersion = ($current && $current['max_v']) ? (int)$current['max_v'] + 1 : 1;

            Database::execute("UPDATE workflow_preset_versions SET is_current = 0 WHERE preset_id = ?", [$presetId]);

            $versionId = Database::generateUuid('wpv');
            Database::execute(
                "INSERT INTO workflow_preset_versions (id, preset_id, version_number, stages_json, is_current) VALUES (?, ?, ?, ?, 1)",
                [$versionId, $presetId, $nextVersion, json_encode($stages)]
            );

            return [
                'version_id'     => $versionId,
                'preset_id'      => $presetId,
                'version_number' => $nextVersion,
                'stages'         => $stages
            ];
        });
    }
}
