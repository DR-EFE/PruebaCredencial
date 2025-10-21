import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/core/api/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

interface Student {
    boleta: string;
    nombre: string;
    apellido: string;
    carrera: string;
    escuela: string;
    turno: string;
    curp: string;
    fotografia?: string | null;
    activo: boolean;
}

interface InfoRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
}

interface ChartData {
    label: string;
    value: number;
    color: string;
}

interface BarChartProps {
    data: ChartData[];
}

interface AttendanceStats {
    presentes: number;
    tardanzas: number;
    faltas: number;
    totalSesiones: number;
}

type Asistencia = {
    estado: string;
}

const InfoRow = ({ icon, label, value }: InfoRowProps) => (
    <View style={styles.infoRow}>
        <Ionicons name={icon} size={20} color="#6b7280" style={styles.infoIcon} />
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

// A simple component for bar chart
const BarChart = ({ data }: BarChartProps) => {
    const maxValue = Math.max(...data.map((d: ChartData) => d.value), 1); // Avoid division by zero
    return (
        <View style={styles.chartContainer}>
            {data.map((item: ChartData, index: number) => (
                <View key={index} style={styles.barWrapper}>
                    <View style={[styles.bar, { height: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }]} />
                    <Text style={styles.barValue}>{item.value}</Text>
                    <Text style={styles.barLabel}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
};

export default function StudentReportScreen() {
    const { materiaId, boleta } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<Student | null>(null);
    const [materia, setMateria] = useState<{ nombre: string } | null>(null);
    const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);

    const loadStudentReport = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch student and materia info
            const { data: studentData, error: studentError } = await supabase.from('estudiantes').select('*').eq('boleta', boleta).single();
            if (studentError) throw studentError;
            setStudent(studentData);

            const { data: materiaData, error: materiaError } = await supabase.from('materias').select('*').eq('id', materiaId).single();
            if (materiaError) throw materiaError;
            setMateria(materiaData);

            // Fetch attendance for this student in this course
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('asistencias')
                .select('estado')
                .eq('materia_id', materiaId)
                .eq('boleta', boleta);
            
            if (attendanceError) throw attendanceError;

            const presentes = attendanceData.filter((a: Asistencia) => a.estado === 'presente').length;
            const tardanzas = attendanceData.filter((a: Asistencia) => a.estado === 'tardanza').length;
            
            // To get 'faltas', we need total sessions for the materia
            const { count: totalSesiones, error: sesionError } = await supabase
                .from('sesiones')
                .select('*', { count: 'exact', head: true })
                .eq('materia_id', materiaId)
                .eq('estado', 'impartida');

            if (sesionError) throw sesionError;

            const faltas = (totalSesiones ?? 0) - (presentes + tardanzas);

            setAttendanceStats({ presentes, tardanzas, faltas: faltas > 0 ? faltas : 0, totalSesiones: totalSesiones ?? 0 });

        } catch (error) {
            console.error(error);
            // Handle error display
        } finally {
            setLoading(false);
        }
    }, [boleta, materiaId]);

    useEffect(() => {
        if (materiaId && boleta) {
            loadStudentReport();
        }
    }, [boleta, loadStudentReport, materiaId]);

    if (loading) {
        return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#2563eb" /></View>;
    }

    if (!student || !materia || !attendanceStats) {
        return <View style={styles.centerContainer}><Text>No se pudo cargar la información.</Text></View>;
    }

    const chartData: ChartData[] = [
        { label: 'Presente', value: attendanceStats.presentes, color: '#10b981' },
        { label: 'Tardanza', value: attendanceStats.tardanzas, color: '#f59e0b' },
        { label: 'Falta', value: attendanceStats.faltas, color: '#ef4444' },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                 <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    {student.fotografia ? (
                        <Image source={{ uri: student.fotografia }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={24} color="#2563eb" />
                        </View>
                    )}
                    <Text style={styles.headerTitle}>{`${student.nombre} ${student.apellido}`}</Text>
                </View>
            </View>
            <View style={styles.content}>
                <View style={styles.studentInfoCard}>
                    <Text style={styles.cardTitle}>Información Académica</Text>
                    <InfoRow icon="id-card-outline" label="Boleta" value={student.boleta} />
                    <InfoRow icon="school-outline" label="Carrera" value={student.carrera} />
                    <InfoRow icon="business-outline" label="Escuela" value={student.escuela} />
                    <InfoRow icon="time-outline" label="Turno" value={student.turno} />
                    <InfoRow icon="document-text-outline" label="CURP" value={student.curp} />
                </View>
                
                <View style={styles.chartCard}>
                    <Text style={styles.cardTitle}>Asistencia en: {materia.nombre} ({attendanceStats.totalSesiones} sesiones)</Text>
                    <BarChart data={chartData} />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        marginRight: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 40, height: 40, borderRadius: 20, marginRight: 12,
        backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
    },
    content: {
        padding: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#111827',
    },
    studentInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoIcon: {
        marginRight: 12,
    },
    infoLabel: {
        fontSize: 15,
        color: '#374151',
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 15,
        color: '#6b7280',
        marginLeft: 8,
        flex: 1,
    },
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        height: 150,
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 16,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    bar: {
        width: 35,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    barValue: {
        position: 'absolute',
        top: -20,
        fontWeight: 'bold',
        color: '#374151',
    },
    barLabel: {
        marginTop: 8,
        fontSize: 12,
        color: '#6b7280',
    },
});
